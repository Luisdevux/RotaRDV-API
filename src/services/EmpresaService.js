import mongoose from 'mongoose';
import {
    CustomError,
    HttpStatusCodes,
    ensurePermission,
    DateHelper,
    EmailHelper,
    ValidationHelper
} from '../utils/helpers/index.js';
import AuthHelper from '../utils/AuthHelper.js';
import EmpresaRepository from '../repositories/EmpresaRepository.js';
import UsuarioRepository from '../repositories/UsuarioRepository.js';
import VeiculoRepository from '../repositories/VeiculoRepository.js';
import ViagemRepository from '../repositories/ViagemRepository.js';
import UploadService from './UploadService.js';

class EmpresaService {
    constructor() {
        this.repository = new EmpresaRepository();
        this.usuarioRepository = new UsuarioRepository();
        this.veiculoRepository = new VeiculoRepository();
        this.viagemRepository = new ViagemRepository();
        this.uploadService = new UploadService();
    }

    async listar(req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);
        const { id } = req.params || {};

        if (id) {
            const empresa = await ValidationHelper.ensureExists(await this.repository.buscarPorID(id), 'Empresa');

            const isGestorDestaEmpresa = String(usuarioLogado.empresa_id) === String(id) || String(empresa.gestor_id?._id || empresa.gestor_id) === String(usuarioLogado._id);
            const isMotoristaDestaEmpresa = String(usuarioLogado.empresa_id) === String(id);

            ensurePermission({
                usuarioLogado,
                isOwner: isGestorDestaEmpresa || isMotoristaDestaEmpresa,
                field: 'Consulta de Empresa',
                customMessage: 'Você não tem permissão para acessar os dados desta empresa.',
            });

            return empresa;
        }

        const filtrosOverride = {};
        if (!usuarioLogado.isAdmin) {
            if (usuarioLogado.empresa_id) {
                filtrosOverride._id = String(usuarioLogado.empresa_id);
            } else {
                throw new CustomError({
                    statusCode: HttpStatusCodes.FORBIDDEN.code,
                    errorType: 'permissionError',
                    field: 'Consulta de Empresa',
                    customMessage: 'Você não está vinculado a nenhuma empresa.',
                });
            }
        }

        const data = await this.repository.listar(req, filtrosOverride);
        return data;
    }

    async criar(parsedData, req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);

        if (!usuarioLogado.isAdmin) {
            throw new CustomError({
                statusCode: HttpStatusCodes.FORBIDDEN.code,
                errorType: 'permissionError',
                field: 'Criação de Empresa',
                customMessage: 'Apenas administradores do sistema podem cadastrar novas empresas.',
            });
        }

        await ValidationHelper.validateCnpj(this.repository, parsedData.cnpj);
        await ValidationHelper.validateEmail(this.repository, parsedData.email, null, 'Email institucional já cadastrado.');

        if (parsedData.gestor_id) {
            await ValidationHelper.ensureExists(await this.usuarioRepository.buscarPorID(parsedData.gestor_id), 'Gestor');
        }

        const empresa = await this.repository.criar(parsedData);

        // Se informou gestor, atualiza o usuário com role gestor e empresa_id
        if (parsedData.gestor_id) {
            await this.usuarioRepository.atualizar(parsedData.gestor_id, {
                role: 'gestor',
                empresa_id: empresa._id,
                'empresa.nome': empresa.nome_empresa,
                'empresa.cargo': 'Gestor de Frota'
            });
        }

        return empresa;
    }

    async atualizar(id, parsedData, req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);
        const empresaExistente = await ValidationHelper.ensureExists(await this.repository.buscarPorID(id), 'Empresa');

        const isGestorDestaEmpresa = String(usuarioLogado.empresa_id) === String(id) || String(empresaExistente.gestor_id?._id || empresaExistente.gestor_id) === String(usuarioLogado._id);

        ensurePermission({
            usuarioLogado,
            isOwner: isGestorDestaEmpresa,
            field: 'Atualização de Empresa',
            customMessage: 'Você não tem permissão para alterar os dados desta empresa.',
        });

        if (parsedData.cnpj) {
            await ValidationHelper.validateCnpj(this.repository, parsedData.cnpj, id);
        }

        if (parsedData.email) {
            await ValidationHelper.validateEmail(this.repository, parsedData.email, id, 'Email institucional já cadastrado.');
        }

        // Apenas Admin pode transferir a gestão ou alterar gestor_id
        if (parsedData.gestor_id && !usuarioLogado.isAdmin) {
            delete parsedData.gestor_id;
        }

        const empresaAtualizada = await this.repository.atualizar(id, parsedData);

        if (parsedData.gestor_id) {
            await this.usuarioRepository.atualizar(parsedData.gestor_id, {
                role: 'gestor',
                empresa_id: empresaAtualizada._id,
                'empresa.nome': empresaAtualizada.nome_empresa,
                'empresa.cargo': 'Gestor de Frota'
            });
        }

        return empresaAtualizada;
    }

    async atualizarStatus(id, parsedData, req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);
        await ValidationHelper.ensureExists(await this.repository.buscarPorID(id), 'Empresa');

        if (!usuarioLogado.isAdmin) {
            throw new CustomError({
                statusCode: HttpStatusCodes.FORBIDDEN.code,
                errorType: 'permissionError',
                field: 'Status da Empresa',
                customMessage: 'Apenas administradores podem ativar ou inativar empresas.',
            });
        }

        const empresaAtualizada = await this.repository.atualizar(id, { status: parsedData.status });
        return empresaAtualizada;
    }

    async deletar(id, req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);
        await ValidationHelper.ensureExists(await this.repository.buscarPorID(id), 'Empresa');

        if (!usuarioLogado.isAdmin) {
            throw new CustomError({
                statusCode: HttpStatusCodes.FORBIDDEN.code,
                errorType: 'permissionError',
                field: 'Exclusão de Empresa',
                customMessage: 'Apenas administradores do sistema podem excluir empresas.',
            });
        }

        const totalMotoristas = await this.repository.contarMotoristas(id);
        if (totalMotoristas > 0) {
            throw new CustomError({
                statusCode: HttpStatusCodes.CONFLICT.code,
                errorType: 'businessRuleError',
                field: 'empresa',
                customMessage: `Não é possível excluir esta empresa pois ainda existem ${totalMotoristas} motoristas vinculados a ela.`,
            });
        }

        const totalVeiculos = await this.repository.contarVeiculos(id);
        if (totalVeiculos > 0) {
            throw new CustomError({
                statusCode: HttpStatusCodes.CONFLICT.code,
                errorType: 'businessRuleError',
                field: 'empresa',
                customMessage: `Não é possível excluir esta empresa pois ainda existem ${totalVeiculos} veículos cadastrados.`,
            });
        }

        const deletada = await this.repository.deletar(id);
        return deletada;
    }

    // =========================================================================
    // GESTÃO DE MOTORISTAS DA EMPRESA
    // =========================================================================

    /**
     * Cadastra e vincula um novo motorista à empresa
     */
    async cadastrarMotorista(empresaId, dadosMotorista, req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);
        const empresa = await ValidationHelper.ensureExists(await this.repository.buscarPorID(empresaId), 'Empresa');

        const isGestorDestaEmpresa = String(usuarioLogado.empresa_id) === String(empresaId) || String(empresa.gestor_id?._id || empresa.gestor_id) === String(usuarioLogado._id);

        ensurePermission({
            usuarioLogado,
            isOwner: isGestorDestaEmpresa,
            field: 'Cadastro de Motorista',
            customMessage: 'Você não tem permissão para cadastrar motoristas nesta empresa.',
        });

        if (empresa.status === 'inativo') {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'businessRuleError',
                field: 'empresa',
                customMessage: 'Não é possível cadastrar motoristas em uma empresa inativa.',
            });
        }

        // 1. Verificar se o usuário já existe por Email ou CPF
        const usuarioExistenteEmail = await this.usuarioRepository.buscarPorEmail(dadosMotorista.email);
        const usuarioExistenteCpf = await this.usuarioRepository.buscarPorCpf(dadosMotorista.cpf);
        const usuarioExistente = usuarioExistenteEmail || usuarioExistenteCpf;

        let motoristaFinal;

        if (usuarioExistente) {
            // Se já existe e já tem empresa vinculada diferente
            if (usuarioExistente.empresa_id && String(usuarioExistente.empresa_id) !== String(empresaId)) {
                throw new CustomError({
                    statusCode: HttpStatusCodes.CONFLICT.code,
                    errorType: 'businessRuleError',
                    field: 'motorista',
                    customMessage: 'Este motorista já está vinculado a outra empresa.',
                });
            }

            // Atualiza o vínculo com a empresa
            motoristaFinal = await this.usuarioRepository.atualizar(usuarioExistente._id, {
                empresa_id: empresaId,
                role: 'motorista',
                empresa: {
                    nome: empresa.nome_empresa,
                    cargo: dadosMotorista.cargo || 'Motorista'
                },
                veiculo_id: dadosMotorista.veiculo_id || usuarioExistente.veiculo_id,
                email_verificado: true
            });
        } else {
            // Cria um novo usuário motorista
            let senhaHasheada;
            if (dadosMotorista.senha) {
                senhaHasheada = await AuthHelper.hashPassword(dadosMotorista.senha);
            } else {
                // Gera senha aleatória segura caso não tenha sido informada
                const senhaTemporaria = await AuthHelper.generateRandomToken(6);
                senhaHasheada = await AuthHelper.hashPassword(senhaTemporaria);
            }

            const novoUsuarioData = {
                nome: dadosMotorista.nome,
                email: dadosMotorista.email.toLowerCase().trim(),
                cpf: dadosMotorista.cpf.replace(/\D/g, ''),
                senha: senhaHasheada,
                authProvider: 'local',
                role: 'motorista',
                status: 'ativo',
                isAdmin: false,
                email_verificado: true,
                empresa_id: empresaId,
                empresa: {
                    nome: empresa.nome_empresa,
                    cargo: dadosMotorista.cargo || 'Motorista'
                },
                veiculo_id: dadosMotorista.veiculo_id || null
            };

            motoristaFinal = await this.usuarioRepository.criar(novoUsuarioData);
        }

        // Se informou veículo, vincula o veículo à empresa também
        if (dadosMotorista.veiculo_id) {
            await this.veiculoRepository.atualizar(dadosMotorista.veiculo_id, {
                empresa_id: empresaId
            });
        }

        // Enviar email de boas-vindas ao motorista via EmailHelper
        EmailHelper.enviarEmailBoasVindasMotorista({
            usuarioId: motoristaFinal._id,
            email: motoristaFinal.email,
            nome: motoristaFinal.nome,
            nomeEmpresa: empresa.nome_empresa
        });

        const motoristaLimpo = motoristaFinal.toObject ? motoristaFinal.toObject() : motoristaFinal;
        delete motoristaLimpo.senha;

        return motoristaLimpo;
    }

    /**
     * Vincula um motorista que já possui cadastro na plataforma à empresa.
     */
    async vincularMotorista(empresaId, parsedData, req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);
        const empresa = await ValidationHelper.ensureExists(await this.repository.buscarPorID(empresaId), 'Empresa');

        const isGestorDestaEmpresa = String(usuarioLogado.empresa_id) === String(empresaId) || String(empresa.gestor_id?._id || empresa.gestor_id) === String(usuarioLogado._id);

        ensurePermission({
            usuarioLogado,
            isOwner: isGestorDestaEmpresa,
            field: 'Vínculo de Motorista',
            customMessage: 'Você não tem permissão para vincular motoristas a esta empresa.',
        });

        let motorista;
        if (parsedData.usuario_id) {
            motorista = await this.usuarioRepository.buscarPorID(parsedData.usuario_id);
        } else if (parsedData.email) {
            motorista = await this.usuarioRepository.buscarPorEmail(parsedData.email);
        } else if (parsedData.cpf) {
            motorista = await this.usuarioRepository.buscarPorCpf(parsedData.cpf.replace(/\D/g, ''));
        }

        ValidationHelper.ensureExists(motorista, 'Motorista');

        if (motorista.empresa_id && String(motorista.empresa_id) !== String(empresaId)) {
            throw new CustomError({
                statusCode: HttpStatusCodes.CONFLICT.code,
                errorType: 'businessRuleError',
                field: 'motorista',
                customMessage: 'Este motorista já pertence a outra empresa.',
            });
        }

        const atualizado = await this.usuarioRepository.atualizar(motorista._id, {
            empresa_id: empresaId,
            role: 'motorista',
            empresa: {
                nome: empresa.nome_empresa,
                cargo: parsedData.cargo || 'Motorista'
            },
            veiculo_id: parsedData.veiculo_id || motorista.veiculo_id
        });

        if (parsedData.veiculo_id) {
            await this.veiculoRepository.atualizar(parsedData.veiculo_id, {
                empresa_id: empresaId
            });
        }

        EmailHelper.enviarEmailBoasVindasMotorista({
            usuarioId: atualizado._id,
            email: atualizado.email,
            nome: atualizado.nome,
            nomeEmpresa: empresa.nome_empresa
        });

        return atualizado;
    }

    /**
     * Desvincula um motorista da empresa
     */
    async desvincularMotorista(empresaId, motoristaId, req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);
        await ValidationHelper.ensureExists(await this.repository.buscarPorID(empresaId), 'Empresa');

        const isGestorDestaEmpresa = String(usuarioLogado.empresa_id) === String(empresaId);

        ensurePermission({
            usuarioLogado,
            isOwner: isGestorDestaEmpresa,
            field: 'Desvínculo de Motorista',
            customMessage: 'Você não tem permissão para desvincular motoristas desta empresa.',
        });

        const motorista = await ValidationHelper.ensureExists(await this.usuarioRepository.buscarPorID(motoristaId), 'Motorista');

        if (String(motorista.empresa_id) !== String(empresaId)) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'businessRuleError',
                field: 'motorista',
                customMessage: 'Este motorista não está vinculado a esta empresa.',
            });
        }

        const atualizado = await this.usuarioRepository.atualizar(motoristaId, {
            empresa_id: null,
            empresa: {
                nome: '',
                cargo: ''
            }
        });

        return atualizado;
    }

    /**
     * Lista todos os motoristas de uma empresa com paginação
     */
    async listarMotoristas(empresaId, req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);
        await ValidationHelper.ensureExists(await this.repository.buscarPorID(empresaId), 'Empresa');

        const isGestorDestaEmpresa = String(usuarioLogado.empresa_id) === String(empresaId);

        ensurePermission({
            usuarioLogado,
            isOwner: isGestorDestaEmpresa,
            field: 'Listagem de Motoristas',
            customMessage: 'Você não tem permissão para listar motoristas desta empresa.',
        });

        const { page = 1, limite = 10, nome, status, cpf: cpfFiltro } = req.query || {};
        const limitOptions = Math.min(parseInt(limite, 10), 100);

        const filtros = {
            empresa_id: empresaId,
            role: 'motorista'
        };

        if (nome) filtros.nome = { $regex: nome, $options: 'i' };
        if (status) filtros.status = status;
        if (cpfFiltro) filtros.cpf = { $regex: cpfFiltro.replace(/\D/g, ''), $options: 'i' };

        const options = {
            page: parseInt(page, 10),
            limit: limitOptions,
            sort: { nome: 1 },
            populate: 'veiculo_id'
        };

        const resultado = await this.usuarioRepository.modelUsuario.paginate(filtros, options);
        resultado.docs = resultado.docs.map(doc => (typeof doc.toObject === 'function' ? doc.toObject() : doc));
        return resultado;
    }

    /**
     * Lista todos os veículos vinculados à empresa
     */
    async listarVeiculos(empresaId, req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);
        await ValidationHelper.ensureExists(await this.repository.buscarPorID(empresaId), 'Empresa');

        const isGestorDestaEmpresa = String(usuarioLogado.empresa_id) === String(empresaId);

        ensurePermission({
            usuarioLogado,
            isOwner: isGestorDestaEmpresa,
            field: 'Listagem de Veículos',
            customMessage: 'Você não tem permissão para listar veículos desta empresa.',
        });

        const { page = 1, limite = 10, placa, modelo } = req.query || {};
        const limitOptions = Math.min(parseInt(limite, 10), 100);

        const filtros = { empresa_id: empresaId };
        if (placa) filtros.placa = { $regex: placa, $options: 'i' };
        if (modelo) filtros.modelo = { $regex: modelo, $options: 'i' };

        const options = {
            page: parseInt(page, 10),
            limit: limitOptions,
            sort: { modelo: 1 }
        };

        const resultado = await this.veiculoRepository.modelVeiculo.paginate(filtros, options);
        resultado.docs = resultado.docs.map(doc => (typeof doc.toObject === 'function' ? doc.toObject() : doc));
        return resultado;
    }

    /**
     * Lista todas as viagens dos motoristas desta empresa
     */
    async listarViagens(empresaId, req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);
        await ValidationHelper.ensureExists(await this.repository.buscarPorID(empresaId), 'Empresa');

        const isGestorDestaEmpresa = String(usuarioLogado.empresa_id) === String(empresaId);

        ensurePermission({
            usuarioLogado,
            isOwner: isGestorDestaEmpresa,
            field: 'Listagem de Viagens',
            customMessage: 'Você não tem permissão para listar viagens desta empresa.',
        });

        const { page = 1, limite = 10, status, data_inicio, data_fim, usuario_id, veiculo_id } = req.query || {};
        const limitOptions = Math.min(parseInt(limite, 10), 100);

        const filtros = { empresa_id: empresaId };
        if (status) filtros.status = status;
        if (usuario_id) filtros.usuario_id = usuario_id;
        if (veiculo_id) filtros.veiculo_id = veiculo_id;

        const inicio = DateHelper.parseFlexibleDate(data_inicio);
        const fim = DateHelper.parseFlexibleDate(data_fim);
        if (inicio || fim) {
            filtros.data_inicio = {};
            if (inicio) filtros.data_inicio.$gte = inicio;
            if (fim) {
                if (typeof data_fim === 'string' && !data_fim.includes('T') && !data_fim.includes(':')) {
                    fim.setHours(23, 59, 59, 999);
                }
                filtros.data_inicio.$lte = fim;
            }
        }

        const options = {
            page: parseInt(page, 10),
            limit: limitOptions,
            sort: { data_inicio: -1 },
            populate: [
                { path: 'usuario_id', select: 'nome email cpf' },
                { path: 'veiculo_id', select: 'modelo placa' }
            ]
        };

        const resultado = await this.viagemRepository.modelViagem.paginate(filtros, options);
        resultado.docs = resultado.docs.map(doc => (typeof doc.toObject === 'function' ? doc.toObject() : doc));
        return resultado;
    }

    /**
     * Obtém resumo de métricas para o Painel Web da Empresa
     */
    async obterDashboard(empresaId, req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);
        const empresa = await ValidationHelper.ensureExists(await this.repository.buscarPorID(empresaId), 'Empresa');

        const isGestorDestaEmpresa = String(usuarioLogado.empresa_id) === String(empresaId) || String(empresa.gestor_id?._id || empresa.gestor_id) === String(usuarioLogado._id);

        ensurePermission({
            usuarioLogado,
            isOwner: isGestorDestaEmpresa,
            field: 'Dashboard da Empresa',
            customMessage: 'Você não tem permissão para acessar o dashboard desta empresa.',
        });

        const totalMotoristas = await this.repository.contarMotoristas(empresaId);
        const totalVeiculos = await this.repository.contarVeiculos(empresaId);
        const viagensEmAndamento = await this.repository.contarViagens(empresaId, 'em_andamento');
        const viagensConcluidas = await this.repository.contarViagens(empresaId, 'concluída');

        // Agregar despesas das viagens da empresa
        const Despesa = mongoose.model('despesas');
        const Viagem = mongoose.model('viagens');

        const viagensEmpresa = await Viagem.find({ empresa_id: empresaId }).select('_id km_inicial km_final');
        const viagemIds = viagensEmpresa.map(v => v._id);

        let totalDespesasGeral = 0;
        const despesasPorCategoria = {
            ABASTECIMENTO: 0,
            ALIMENTACAO: 0,
            MANUTENCAO: 0,
            PEDAGIO: 0,
            OUTROS: 0
        };

        if (viagemIds.length > 0) {
            const agregacaoDespesas = await Despesa.aggregate([
                { $match: { viagem_id: { $in: viagemIds } } },
                {
                    $group: {
                        _id: '$tipo',
                        total: { $sum: '$valor_total' }
                    }
                }
            ]);

            agregacaoDespesas.forEach(item => {
                if (item._id in despesasPorCategoria) {
                    despesasPorCategoria[item._id] = item.total;
                    totalDespesasGeral += item.total;
                }
            });
        }

        // Total de KM rodado nas viagens concluídas
        let totalKmRodado = 0;
        viagensEmpresa.forEach(v => {
            if (v.km_final && v.km_inicial && v.km_final > v.km_inicial) {
                totalKmRodado += (v.km_final - v.km_inicial);
            }
        });

        return {
            empresa: {
                id: empresa._id,
                nome_empresa: empresa.nome_empresa,
                cnpj: empresa.cnpj,
                status: empresa.status
            },
            resumo: {
                total_motoristas: totalMotoristas,
                total_veiculos: totalVeiculos,
                viagens_em_andamento: viagensEmAndamento,
                viagens_concluidas: viagensConcluidas,
                total_km_rodado: totalKmRodado,
                total_despesas: totalDespesasGeral,
                despesas_por_categoria: despesasPorCategoria
            }
        };
    }

    // =========================================================================
    // UPLOAD / EXCLUSÃO DE LOGOTIPO DA EMPRESA (GARAGE / MINIO)
    // =========================================================================

    async fotoLogoUpload(id, file, req) {
        const empresa = await ValidationHelper.ensureExists(await this.repository.buscarPorID(id), 'Empresa');
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);

        const isGestorDestaEmpresa = String(usuarioLogado.empresa_id) === String(id) || String(empresa.gestor_id?._id || empresa.gestor_id) === String(usuarioLogado._id);

        ensurePermission({
            usuarioLogado,
            isOwner: isGestorDestaEmpresa,
            field: 'Logotipo da Empresa',
            customMessage: 'Você não tem permissão para alterar o logotipo desta empresa.',
        });

        // Redimensiona/otimiza a imagem da logo e faz upload no Garage (S3)
        const uploadResult = await this.uploadService.substituirImagem(
            file,
            empresa.foto_logo,
            { width: 500, height: 500, fit: 'inside', quality: 85 }
        );

        // Atualiza a URL da foto_logo no banco de dados
        await this.repository.atualizar(id, { foto_logo: uploadResult.url });

        return uploadResult;
    }

    async fotoLogoDelete(id, req) {
        const empresa = await ValidationHelper.ensureExists(await this.repository.buscarPorID(id), 'Empresa');
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);

        const isGestorDestaEmpresa = String(usuarioLogado.empresa_id) === String(id) || String(empresa.gestor_id?._id || empresa.gestor_id) === String(usuarioLogado._id);

        ensurePermission({
            usuarioLogado,
            isOwner: isGestorDestaEmpresa,
            field: 'Logotipo da Empresa',
            customMessage: 'Você não tem permissão para remover o logotipo desta empresa.',
        });

        if (!empresa.foto_logo) {
            throw new CustomError({
                statusCode: HttpStatusCodes.NOT_FOUND.code,
                errorType: 'resourceNotFound',
                field: 'foto_logo',
                customMessage: 'Esta empresa não possui um logotipo cadastrado para remover.'
            });
        }

        const urlAntiga = empresa.foto_logo;

        // 1. Remove a URL do banco imediatamente
        await this.repository.atualizar(id, { foto_logo: "" });

        // 2. Deleta do Garage em background com retry
        this.uploadService.deleteImagemComRetry(urlAntiga).catch(err => {
            console.error(`[Aviso] Erro isolado na exclusão do logotipo no storage: ${err.message}`);
        });

        return true;
    }
}

export default EmpresaService;
