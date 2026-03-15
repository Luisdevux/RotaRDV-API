// src/utils/helpers/mongooseBrazilianDatePlugin.js

function brazilianDatePlugin(schema) {
    schema.set('toJSON', { getters: true });
    schema.set('toObject', { getters: true });

    schema.eachPath((pathname, schematype) => {
        if (schematype.instance === 'Date') {
            schematype.get(function (date) {
                if (!date) return null;
                if (!(date instanceof Date)) {
                    date = new Date(date);
                }
                if (isNaN(date.getTime())) {
                    return null;
                }
                const dia = String(date.getDate()).padStart(2, '0');
                const mes = String(date.getMonth() + 1).padStart(2, '0');
                const ano = date.getFullYear();
                return `${dia}/${mes}/${ano}`;
            });

            schematype.set(function (value) {
                if (!value) return null;
                if (value instanceof Date) return value;
                if (typeof value === 'string' && value.includes('/')) {
                    const [dia, mes, ano] = value.split('/').map(Number);
                    return new Date(ano, mes - 1, dia);
                }
                return value;
            });
        }
    });
}

export default brazilianDatePlugin;
