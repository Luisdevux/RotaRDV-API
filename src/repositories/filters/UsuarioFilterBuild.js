// src/repositories/filters/UsuarioFilterBuild.js

import mongoose from "mongoose";

class UsuarioFilterBuild {
    constructor() {
        this.filtros = {};
    }

    comNome(nome) {
        if (nome) {
            const normalizeString = (str) => {
                return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            };
            const normalizedNome = normalizeString(nome);
            const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = escapeRegex(normalizedNome).replace(/a/g, '[aàáâãäå]')
                                                        .replace(/e/g, '[eèéêë]')
                                                        .replace(/i/g, '[iìíîï]')
                                                        .replace(/o/g, '[oòóôõö]')
                                                        .replace(/u/g, '[uùúûü]')
                                                        .replace(/c/g, '[cç]')
                                                        .replace(/n/g, '[nñ]');

            this.filtros.nome = {
                $regex: pattern,
                $options: "i"
            };
        }
        return this;
    }

    comEmail(email) {
        if (email) {
            this.filtros.email = {
                $regex: email,
                $options: "i"
            };
        }
        return this;
    }

    comStatus(status) {
        if (status !== undefined) {
            this.filtros.status = status;
        }
        return this;
    }

    comIsAdmin(isAdmin) {
        if (isAdmin !== undefined) {
            const valor =
                isAdmin === true || isAdmin === "true" || isAdmin === 1 || isAdmin === "1";
            this.filtros.isAdmin = valor;
        }
        return this;
    }

    comCpf(cpf) {
        if (cpf) {
            this.filtros.cpf = {
                $regex: cpf,
                $options: "i"
            };
        }
        return this;
    }

    comCnh(cnh) {
        if (cnh) {
            this.filtros.cnh = {
                $regex: cnh,
                $options: "i"
            };
        }
        return this;
    }

    comVeiculoId(veiculoId) {
        if (veiculoId && mongoose.isValidObjectId(veiculoId)) {
            this.filtros.veiculo_id = veiculoId;
        }
        return this;
    }

    comEmpresaNome(empresaNome) {
        if (empresaNome) {
            this.filtros["empresa.nome"] = {
                $regex: empresaNome,
                $options: "i"
            };
        }
        return this;
    }

    comEmpresaId(empresaId) {
        if (empresaId && mongoose.isValidObjectId(empresaId)) {
            this.filtros.empresa_id = empresaId;
        }
        return this;
    }

    comRole(role) {
        if (role) {
            if (Array.isArray(role)) {
                this.filtros.role = { $in: role };
            } else if (typeof role === 'string' && role.includes(',')) {
                this.filtros.role = { $in: role.split(',').map(r => r.trim()) };
            } else {
                this.filtros.role = role;
            }
        }
        return this;
    }

    build() {
        return this.filtros;
    }
}

export default UsuarioFilterBuild;
