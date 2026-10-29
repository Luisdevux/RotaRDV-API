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
import '../models/Despesa.js';

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
        const isSuperAdmin = usuarioLogado.role === 'superAdmin';
        const { id } = req.params || {};

        if (id) {
            const empresa = await ValidationHelper.ensureExists(await this.repository.buscarPorID(id), 'Empresa');

            const isAdminDestaEmpresa = String(empresa.admin_id?._id || empresa.admin_id) === String(usuarioLogado._id);
            const isStaffDestaEmpresa = String(usuarioLogado.empresa_id) === String(id) || isAdminDestaEmpresa;

            ensurePermission({
                usuarioLogado,
                isOwner: isStaffDestaEmpresa,
                field: 'Consulta de Empresa',
                customMessage: 'Você não tem permissão para acessar os dados desta empresa.',
            });

            return empresa;
        }

        const filtrosOverride = {};
        if (!isSuperAdmin) {
            if (usuarioLogado.role === 'admin') {
                filtrosOverride.$or = [
                    { _id: usuarioLogado.empresa_id },
                    { admin_id: usuarioLogado._id },
                    { matriz_id: usuarioLogado.empresa_id }
                ];
            } else if (usuarioLogado.empresa_id) {
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

        if (usuarioLogado.role !== 'superAdmin') {
            throw new CustomError({
                statusCode: HttpStatusCodes.FORBIDDEN.code,
                errorType: 'permissionError',
                field: 'Criação de Empresa',
                customMessage: 'Apenas Super Administradores do sistema podem cadastrar novas empresas.',
            });
        }

        await ValidationHelper.validateCnpj(this.repository, parsedData.cnpj);
        await ValidationHelper.validateEmail(this.repository, parsedData.email, null, 'Email institucional já cadastrado.');

        if (parsedData.cnpj) {
            parsedData.cnpj = parsedData.cnpj.replace(/[.\-/]/g, '').trim().toUpperCase();
        }

        if (parsedData.admin_id) {
            await ValidationHelper.ensureExists(await this.usuarioRepository.buscarPorID(parsedData.admin_id), 'Administrador');
        }

        const empresa = await this.repository.criar(parsedData);

        // Se informou administrador, atualiza o usuário com empresa_id
        if (parsedData.admin_id) {
            await this.usuarioRepository.atualizar(parsedData.admin_id, {
                empresa_id: empresa._id,
                'empresa.nome': empresa.nome_empresa,
                'empresa.cargo': 'Administrador'
            });
        }

        return empresa;
    }

    async cadastrarFilial(dadosFilial, req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);
        const isSuperAdmin = usuarioLogado.role === 'superAdmin';
        const isAdmin = usuarioLogado.role === 'admin';

        if (!isSuperAdmin && !isAdmin) {
            throw new CustomError({
                statusCode: HttpStatusCodes.FORBIDDEN.code,
                errorType: 'permissionError',
                field: 'Criação de Filial',
                customMessage: 'Apenas Administradores podem cadastrar novas unidades e filiais coligadas.',
            });
        }

        const { CadastrarFilialSchema } = await import('../utils/validators/schemas/zod/EmpresaSchema.js');
        const validated = CadastrarFilialSchema.parse(dadosFilial);

        await ValidationHelper.validateCnpj(this.repository, validated.cnpj);
        const emailFilial = (validated.email || validated.email_empresa).toLowerCase().trim();
        await ValidationHelper.validateEmail(this.repository, emailFilial, null, 'Email institucional já cadastrado.');

        const matrizId = validated.matriz_id || (isAdmin ? usuarioLogado.empresa_id : null);

        let adminId = usuarioLogado._id;
        if (isSuperAdmin && matrizId) {
            const matriz = await this.repository.buscarPorID(matrizId);
            if (matriz && matriz.admin_id) {
                adminId = matriz.admin_id._id || matriz.admin_id;
            }
        }

        const filialData = {
            nome_empresa: validated.nome_empresa,
            cnpj: validated.cnpj.replace(/[.\-/]/g, '').trim().toUpperCase(),
            email: emailFilial,
            telefone: validated.telefone || validated.telefone_empresa || '',
            endereco: validated.endereco || {},
            foto_logo: validated.foto_logo || '',
            status: 'ativo',
            admin_id: adminId,
            matriz_id: matrizId
        };

        const novaFilial = await this.repository.criar(filialData);
        return novaFilial;
    }

    async atualizar(id, parsedData, req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);
        const empresaExistente = await ValidationHelper.ensureExists(await this.repository.buscarPorID(id), 'Empresa');

        const isSuperAdmin = usuarioLogado.role === 'superAdmin';
        const isAdminDestaEmpresa = String(empresaExistente.admin_id?._id || empresaExistente.admin_id) === String(usuarioLogado._id);
        const isStaffDestaEmpresa = String(usuarioLogado.empresa_id) === String(id) || isAdminDestaEmpresa;

        ensurePermission({
            usuarioLogado,
            isOwner: isStaffDestaEmpresa,
            field: 'Atualização de Empresa',
            customMessage: 'Você não tem permissão para alterar os dados desta empresa.',
        });

        if (parsedData.cnpj) {
            await ValidationHelper.validateCnpj(this.repository, parsedData.cnpj, id);
            parsedData.cnpj = parsedData.cnpj.replace(/[.\-/]/g, '').trim().toUpperCase();
        }

        if (parsedData.email) {
            await ValidationHelper.validateEmail(this.repository, parsedData.email, id, 'Email institucional já cadastrado.');
        }

        // Apenas Super Admin ou Admin interno da empresa pode transferir a administração ou alterar admin_id
        if (parsedData.admin_id && !isSuperAdmin && usuarioLogado.role !== 'admin') {
            delete parsedData.admin_id;
        }

        const empresaAtualizada = await this.repository.atualizar(id, parsedData);

        // Se atualizou o admin_id, atualiza o usuário correspondente
        if (parsedData.admin_id) {
            await this.usuarioRepository.atualizar(parsedData.admin_id, {
                empresa_id: empresaAtualizada._id,
                'empresa.nome': empresaAtualizada.nome_empresa,
                'empresa.cargo': 'Administrador'
            });
        }

        return empresaAtualizada;
    }

    async atualizarStatus(id, parsedData, req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);
        await ValidationHelper.ensureExists(await this.repository.buscarPorID(id), 'Empresa');

        if (usuarioLogado.role !== 'superAdmin') {
            throw new CustomError({
                statusCode: HttpStatusCodes.FORBIDDEN.code,
                errorType: 'permissionError',
                field: 'Status da Empresa',
                customMessage: 'Apenas Super Administradores podem ativar ou inativar empresas.',
            });
        }

        const empresaAtualizada = await this.repository.atualizar(id, { status: parsedData.status });
        return empresaAtualizada;
    }

    async deletar(id, req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);
        await ValidationHelper.ensureExists(await this.repository.buscarPorID(id), 'Empresa');

        if (usuarioLogado.role !== 'superAdmin') {
            throw new CustomError({
                statusCode: HttpStatusCodes.FORBIDDEN.code,
                errorType: 'permissionError',
                field: 'Exclusão de Empresa',
                customMessage: 'Apenas Super Administradores do sistema podem excluir empresas.',
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

    // Métodos e regras de negócios da parte de gestão da empresa

    /**
     * Cadastra e vincula um novo motorista à empresa
     */
    async cadastrarMotorista(empresaId, dadosMotorista, req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);
        const empresa = await ValidationHelper.ensureExists(await this.repository.buscarPorID(empresaId), 'Empresa');

        const isAdminDestaEmpresa = String(empresa.admin_id?._id || empresa.admin_id) === String(usuarioLogado._id);
        const isStaffDestaEmpresa = String(usuarioLogado.empresa_id) === String(empresaId) || isAdminDestaEmpresa;

        ensurePermission({
            usuarioLogado,
            isOwner: isStaffDestaEmpresa,
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
                email_verificado: true,
                ...(dadosMotorista.cnh ? { cnh: dadosMotorista.cnh } : {}),
                ...(dadosMotorista.telefone ? { telefone: dadosMotorista.telefone } : {})
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
                cpf: dadosMotorista.cpf,
                cnh: dadosMotorista.cnh,
                telefone: dadosMotorista.telefone || '',
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

        // Enviar email de boas-vindas ao motorista com o util EmailHelper
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

        const isAdminDestaEmpresa = String(empresa.admin_id?._id || empresa.admin_id) === String(usuarioLogado._id);
        const isStaffDestaEmpresa = String(usuarioLogado.empresa_id) === String(empresaId) || isAdminDestaEmpresa;

        ensurePermission({
            usuarioLogado,
            isOwner: isStaffDestaEmpresa,
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
        const empresa = await ValidationHelper.ensureExists(await this.repository.buscarPorID(empresaId), 'Empresa');

        const isAdminDestaEmpresa = String(empresa.admin_id?._id || empresa.admin_id) === String(usuarioLogado._id);
        const isStaffDestaEmpresa = String(usuarioLogado.empresa_id) === String(empresaId) || isAdminDestaEmpresa;

        ensurePermission({
            usuarioLogado,
            isOwner: isStaffDestaEmpresa,
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
        const empresa = await ValidationHelper.ensureExists(await this.repository.buscarPorID(empresaId), 'Empresa');

        const isAdminDestaEmpresa = String(empresa.admin_id?._id || empresa.admin_id) === String(usuarioLogado._id);
        const isStaffDestaEmpresa = String(usuarioLogado.empresa_id) === String(empresaId) || isAdminDestaEmpresa;

        ensurePermission({
            usuarioLogado,
            isOwner: isStaffDestaEmpresa,
            field: 'Listagem de Motoristas',
            customMessage: 'Você não tem permissão para listar motoristas desta empresa.',
        });

        const query = req.validatedQuery || req.query || {};
        const { page = 1, limite = 10, nome, status, cpf: cpfFiltro, todos = false } = query;

        const filtros = {
            empresa_id: empresaId,
            role: 'motorista'
        };

        if (nome) filtros.nome = { $regex: nome, $options: 'i' };
        if (status) filtros.status = status;
        if (cpfFiltro) filtros.cpf = { $regex: cpfFiltro.replace(/\D/g, ''), $options: 'i' };

        if (todos || parseInt(limite, 10) === 0) {
            const docs = await this.usuarioRepository.modelUsuario.find(filtros)
                .populate('veiculo_id')
                .sort({ nome: 1 })
                .lean();

            return {
                docs,
                totalDocs: docs.length,
                limit: docs.length,
                totalPages: 1,
                page: 1,
                pagingCounter: 1,
                hasPrevPage: false,
                hasNextPage: false,
                prevPage: null,
                nextPage: null
            };
        }

        const limitOptions = Math.min(parseInt(limite, 10), 1000);

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
        const empresa = await ValidationHelper.ensureExists(await this.repository.buscarPorID(empresaId), 'Empresa');

        const isAdminDestaEmpresa = String(empresa.admin_id?._id || empresa.admin_id) === String(usuarioLogado._id);
        const isStaffDestaEmpresa = String(usuarioLogado.empresa_id) === String(empresaId) || isAdminDestaEmpresa;

        ensurePermission({
            usuarioLogado,
            isOwner: isStaffDestaEmpresa,
            field: 'Listagem de Veículos',
            customMessage: 'Você não tem permissão para listar veículos desta empresa.',
        });

        const query = req.validatedQuery || req.query || {};
        const { page = 1, limite = 10, placa, modelo, todos = false } = query;

        const filtros = { empresa_id: empresaId };
        if (placa) filtros.placa = { $regex: placa, $options: 'i' };
        if (modelo) filtros.modelo = { $regex: modelo, $options: 'i' };

        if (todos || parseInt(limite, 10) === 0) {
            const docs = await this.veiculoRepository.modelVeiculo.find(filtros)
                .sort({ modelo: 1 })
                .lean();

            return {
                docs,
                totalDocs: docs.length,
                limit: docs.length,
                totalPages: 1,
                page: 1,
                pagingCounter: 1,
                hasPrevPage: false,
                hasNextPage: false,
                prevPage: null,
                nextPage: null
            };
        }

        const limitOptions = Math.min(parseInt(limite, 10), 1000);

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
        const empresa = await ValidationHelper.ensureExists(await this.repository.buscarPorID(empresaId), 'Empresa');

        const isAdminDestaEmpresa = String(empresa.admin_id?._id || empresa.admin_id) === String(usuarioLogado._id);
        const isStaffDestaEmpresa = String(usuarioLogado.empresa_id) === String(empresaId) || isAdminDestaEmpresa;

        ensurePermission({
            usuarioLogado,
            isOwner: isStaffDestaEmpresa,
            field: 'Listagem de Viagens',
            customMessage: 'Você não tem permissão para listar viagens desta empresa.',
        });

        const query = req.validatedQuery || req.query || {};
        const { page = 1, limite = 10, status, data_inicio, data_fim, usuario_id, veiculo_id, todos = false } = query;

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

        const ViagemService = (await import('./ViagemService.js')).default;
        const viagemServiceInstance = new ViagemService();

        if (todos || parseInt(limite, 10) === 0) {
            const docs = await this.viagemRepository.modelViagem.find(filtros)
                .populate([
                    { path: 'usuario_id', select: 'nome email cpf' },
                    { path: 'veiculo_id', select: 'modelo placa' }
                ])
                .sort({ data_inicio: -1 })
                .lean();

            for (const doc of docs) {
                doc.resumo_financeiro = await viagemServiceInstance._calcularResumoFinanceiro(doc._id, doc);
            }

            return {
                docs,
                totalDocs: docs.length,
                limit: docs.length,
                totalPages: 1,
                page: 1,
                pagingCounter: 1,
                hasPrevPage: false,
                hasNextPage: false,
                prevPage: null,
                nextPage: null
            };
        }

        const limitOptions = Math.min(parseInt(limite, 10), 1000);

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

        for (const doc of resultado.docs) {
            doc.resumo_financeiro = await viagemServiceInstance._calcularResumoFinanceiro(doc._id, doc);
        }

        return resultado;
    }

    /**
     * Rota feita com o objetivo de obter o resumo de métricas para um Painel Web da Empresa
     */
    async obterDashboard(empresaId, req) {
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);
        const empresa = await ValidationHelper.ensureExists(await this.repository.buscarPorID(empresaId), 'Empresa');

        const isAdminDestaEmpresa = String(empresa.admin_id?._id || empresa.admin_id) === String(usuarioLogado._id);
        const isStaffDestaEmpresa = String(usuarioLogado.empresa_id) === String(empresaId) || isAdminDestaEmpresa;

        ensurePermission({
            usuarioLogado,
            isOwner: isStaffDestaEmpresa,
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

        const matchEmpresaIds = [String(empresaId)];
        if (mongoose.Types.ObjectId.isValid(empresaId) && String(new mongoose.Types.ObjectId(empresaId)) === String(empresaId)) {
            matchEmpresaIds.push(new mongoose.Types.ObjectId(empresaId));
        }

        const viagensEmpresa = await Viagem.find({
            empresa_id: { $in: matchEmpresaIds }
        }).select('_id km_inicial km_final status');

        const matchViagemIds = [];
        const matchViagemConcluidaIds = [];
        viagensEmpresa.forEach(v => {
            if (v.status === 'cancelada') return;

            const strId = String(v._id);
            matchViagemIds.push(strId);
            const hasObjId = mongoose.Types.ObjectId.isValid(v._id) && String(new mongoose.Types.ObjectId(v._id)) === strId;
            if (hasObjId) {
                matchViagemIds.push(new mongoose.Types.ObjectId(v._id));
            }

            const isConcluidaComKmValido = v.status === 'concluída' &&
                v.km_final !== null && v.km_final !== undefined &&
                v.km_inicial !== null && v.km_inicial !== undefined &&
                v.km_final > v.km_inicial;

            if (isConcluidaComKmValido) {
                matchViagemConcluidaIds.push(strId);
                if (hasObjId) {
                    matchViagemConcluidaIds.push(new mongoose.Types.ObjectId(v._id));
                }
            }
        });

        let totalDespesasGeral = 0;
        let totalLitrosCombustivel = 0;
        let totalLitrosArla = 0;
        let litrosCombustivelConcluidas = 0;
        const despesasPorCategoria = {
            ABASTECIMENTO: 0,
            ALIMENTACAO: 0,
            MANUTENCAO: 0,
            PEDAGIO: 0,
            OUTROS: 0
        };

        if (matchViagemIds.length > 0) {
            const agregacaoDespesas = await Despesa.aggregate([
                { $match: { viagem_id: { $in: matchViagemIds } } },
                {
                    $group: {
                        _id: '$tipo',
                        total: { $sum: '$valor_total' },
                        litros_combustivel: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ['$tipo', 'ABASTECIMENTO'] },
                                            { $ne: ['$tipo_combustivel', 'ARLA_32'] }
                                        ]
                                    },
                                    { $ifNull: ['$litros', 0] },
                                    0
                                ]
                            }
                        },
                        litros_arla: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ['$tipo', 'ABASTECIMENTO'] },
                                            { $eq: ['$tipo_combustivel', 'ARLA_32'] }
                                        ]
                                    },
                                    { $ifNull: ['$litros', 0] },
                                    0
                                ]
                            }
                        },
                        litros_combustivel_concluidas: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ['$tipo', 'ABASTECIMENTO'] },
                                            { $ne: ['$tipo_combustivel', 'ARLA_32'] },
                                            { $in: ['$viagem_id', matchViagemConcluidaIds] }
                                        ]
                                    },
                                    { $ifNull: ['$litros', 0] },
                                    0
                                ]
                            }
                        }
                    }
                }
            ]);

            agregacaoDespesas.forEach(item => {
                if (item._id in despesasPorCategoria) {
                    despesasPorCategoria[item._id] = item.total;
                    totalDespesasGeral += item.total;
                }
                if (item._id === 'ABASTECIMENTO') {
                    totalLitrosCombustivel += (item.litros_combustivel || 0);
                    totalLitrosArla += (item.litros_arla || 0);
                    litrosCombustivelConcluidas += (item.litros_combustivel_concluidas || 0);
                }
            });
        }

        // Total de KM rodado auditado apenas nas viagens concluídas
        let totalKmRodado = 0;
        viagensEmpresa.forEach(v => {
            if (v.status === 'concluída' && v.km_final !== null && v.km_final !== undefined && v.km_inicial !== null && v.km_inicial !== undefined && v.km_final > v.km_inicial) {
                totalKmRodado += (v.km_final - v.km_inicial);
            }
        });

        // Média de consumo geral da frota (km/l): compara estritamente KM e litros de combustível das viagens concluídas (sem Arla 32 e sem viagens abertas)
        let mediaConsumoFrota = 0;
        if (litrosCombustivelConcluidas > 0 && totalKmRodado > 0) {
            mediaConsumoFrota = parseFloat((totalKmRodado / litrosCombustivelConcluidas).toFixed(2));
        }

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
                total_litros: totalLitrosCombustivel,
                total_litros_arla: totalLitrosArla,
                media_consumo_frota: mediaConsumoFrota,
                total_despesas: totalDespesasGeral,
                despesas_por_categoria: despesasPorCategoria
            }
        };
    }

    // ================================
    // UPLOAD DE FOTO
    // ================================
    async fotoUpload(id, file, req) {
        const empresa = await ValidationHelper.ensureExists(await this.repository.buscarPorID(id), 'Empresa');
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);

        const isAdminDestaEmpresa = String(empresa.admin_id?._id || empresa.admin_id) === String(usuarioLogado._id);
        const isStaffDestaEmpresa = String(usuarioLogado.empresa_id) === String(id) || isAdminDestaEmpresa;

        ensurePermission({
            usuarioLogado,
            isOwner: isStaffDestaEmpresa,
            field: 'Empresa',
            customMessage: 'Você não tem permissão para alterar a foto desta empresa.',
        });

        // O 'substituirImagem' já trata se 'empresa.foto_logo' for null ou se não existir
        const uploadResult = await this.uploadService.substituirImagem(
            file,
            empresa.foto_logo,
            { width: 500, height: 500, fit: 'inside', quality: 85 }
        );

        // Atualiza a URL da foto_logo no banco de dados
        await this.repository.atualizar(id, { foto_logo: uploadResult.url });

        return uploadResult;
    }

    async fotoDelete(id, req) {
        const empresa = await ValidationHelper.ensureExists(await this.repository.buscarPorID(id), 'Empresa');
        const usuarioLogado = await this.usuarioRepository.buscarPorID(req.user_id);

        const isAdminDestaEmpresa = String(empresa.admin_id?._id || empresa.admin_id) === String(usuarioLogado._id);
        const isStaffDestaEmpresa = String(usuarioLogado.empresa_id) === String(id) || isAdminDestaEmpresa;

        ensurePermission({
            usuarioLogado,
            isOwner: isStaffDestaEmpresa,
            field: 'Empresa',
            customMessage: 'Você não tem permissão para excluir a foto desta empresa.',
        });

        if (!empresa.foto_logo) {
            throw new CustomError({
                statusCode: HttpStatusCodes.NOT_FOUND.code,
                errorType: 'resourceNotFound',
                field: 'foto_logo',
                customMessage: 'Esta empresa não possui uma foto cadastrada para remover.'
            });
        }

        const urlAntiga = empresa.foto_logo;

        // 1. Remove a URL do banco de dados imediatamente
        await this.repository.atualizar(id, { foto_logo: "" });

        // 2. Deleta do Garage em background com retry
        this.uploadService.deleteImagemComRetry(urlAntiga).catch(err => {
            console.error(`Erro isolado na exclusão da foto em background: ${err.message}`);
        });

        return true;
    }
}

export default EmpresaService;
