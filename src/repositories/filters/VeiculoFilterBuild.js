// src/repositories/filters/VeiculoFilterBuild.js

class VeiculoFilterBuild {
    constructor() {
        this.filtros = {};
    }

    comId(id) {
        if (id) {
            this.filtros._id = id;
        }
        return this;
    }

    comPlaca(placa) {
        if (placa) {
            this.filtros.placa = {
                $regex: placa,
                $options: "i"
            };
        }
        return this;
    }

    comModelo(modelo) {
        if (modelo) {
            this.filtros.modelo = {
                $regex: modelo,
                $options: "i"
            };
        }
        return this;
    }

    comReboquePlaca(placa) {
        if (placa) {
            this.filtros["reboque.placas"] = {
                $regex: placa,
                $options: "i"
            };
        }
        return this;
    }

    comReboqueModelo(modelo) {
        if (modelo) {
            this.filtros["reboque.modelo"] = {
                $regex: modelo,
                $options: "i"
            };
        }
        return this;
    }

    build() {
        return this.filtros;
    }
}

export default VeiculoFilterBuild;
