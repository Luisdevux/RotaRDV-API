// src/repositories/filters/EmpresaFilterBuild.js

class EmpresaFilterBuild {
    constructor() {
        this.filtros = {};
    }

    comId(id) {
        if (id) {
            this.filtros._id = id;
        }
        return this;
    }

    comNomeEmpresa(nome_empresa) {
        if (nome_empresa) {
            this.filtros.nome_empresa = {
                $regex: nome_empresa,
                $options: "i"
            };
        }
        return this;
    }

    comCnpj(cnpj) {
        if (cnpj) {
            const cleanCnpj = cnpj.replace(/\D/g, '');
            this.filtros.cnpj = {
                $regex: cleanCnpj.length ? cleanCnpj : cnpj,
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
        if (status) {
            this.filtros.status = status;
        }
        return this;
    }

    comCidade(cidade) {
        if (cidade) {
            this.filtros["endereco.cidade"] = {
                $regex: cidade,
                $options: "i"
            };
        }
        return this;
    }

    comEstado(estado) {
        if (estado) {
            this.filtros["endereco.estado"] = estado.toUpperCase();
        }
        return this;
    }

    comGestorId(gestor_id) {
        if (gestor_id) {
            this.filtros.gestor_id = gestor_id;
        }
        return this;
    }

    build() {
        return this.filtros;
    }
}

export default EmpresaFilterBuild;
