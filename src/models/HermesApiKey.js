// src/models/HermesApiKey.js

import mongoose from "mongoose";
import brazilianDatePlugin from "../utils/helpers/mongooseBrazilianDatePlugin.js";

class HermesApiKey {
    constructor() {
        const hermesApiKeySchema = new mongoose.Schema({
            apiKey: {
                type: String,
                required: [true, "A API Key do Hermes é obrigatória!"],
                trim: true
            },
            serviceId: {
                type: String,
                trim: true,
                default: null
            },
            credentialId: {
                type: String,
                trim: true,
                default: null
            },
            active: {
                type: Boolean,
                default: true,
                index: true
            },
            rotatedAt: {
                type: Date,
                default: Date.now
            },
            expiresAt: {
                type: Date,
                default: null
            }
        }, {
            timestamps: true,
            versionKey: false
        });

        hermesApiKeySchema.plugin(brazilianDatePlugin);

        this.model =
            mongoose.models.hermes_api_keys || mongoose.model("hermes_api_keys", hermesApiKeySchema);
    }
}

export default new HermesApiKey().model;
