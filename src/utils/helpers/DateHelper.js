class DateHelper {
    /**
     * Tenta converter uma string para Date de forma flexível.
     * Suporta o padrão ISO-8601 (padrão) e também o formato BR (DD/MM/YYYY).
     * @param {string} dateString A string contendo a data
     * @returns {Date | null} Objeto Date válido ou null se for inválida
     */
    static parseFlexibleDate(dateString) {
        if (!dateString) return null;

        let dateLimit = new Date(dateString);

        // Se for uma data inválida para o padrão ISO, e possuir barras, tenta quebrar como DD/MM/YYYY
        if (isNaN(dateLimit) && dateString.includes('/')) {
            const partes = dateString.split('/');
            if (partes.length === 3) {
                // Em JS, o mês começa do índice 0 (Janeiro = 0, Fevereiro = 1)
                dateLimit = new Date(partes[2], partes[1] - 1, partes[0]);
            }
        }

        return isNaN(dateLimit) ? null : dateLimit;
    }
}

export default DateHelper;
