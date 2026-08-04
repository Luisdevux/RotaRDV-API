class DateHelper {
    /**
     * Tenta converter uma string para Date de forma flexível.
     * Suporta o padrão brasileiro (DD/MM/YYYY ou DD/MM/YYYY HH:mm:ss) e o padrão ISO-8601.
     * @param {string | Date} dateValue A data a ser convertida
     * @returns {Date | null} Objeto Date válido ou null se for inválida
     */
    static parseFlexibleDate(dateValue) {
        if (!dateValue) return null;
        if (dateValue instanceof Date) return isNaN(dateValue.getTime()) ? null : dateValue;
        if (typeof dateValue !== 'string') return null;

        const trimmed = dateValue.trim();

        // Se contiver '/', trata prioritariamente no padrão brasileiro DD/MM/YYYY
        if (trimmed.includes('/')) {
            const [datePart, timePart] = trimmed.split(' ');
            const partes = datePart.split('/');
            if (partes.length === 3) {
                const dia = parseInt(partes[0], 10);
                const mes = parseInt(partes[1], 10) - 1; // Mês no JS começa em 0 (Janeiro = 0)
                const ano = parseInt(partes[2], 10);

                let horas = 0;
                let minutos = 0;
                let segundos = 0;

                if (timePart) {
                    const timeParts = timePart.split(':');
                    horas = parseInt(timeParts[0], 10) || 0;
                    minutos = parseInt(timeParts[1], 10) || 0;
                    segundos = parseInt(timeParts[2], 10) || 0;
                }

                const d = new Date(ano, mes, dia, horas, minutos, segundos);
                return isNaN(d.getTime()) ? null : d;
            }
        }

        // Padrão ISO (YYYY-MM-DD ou ISO-8601 completo)
        const parsedIso = new Date(trimmed);
        return isNaN(parsedIso.getTime()) ? null : parsedIso;
    }
}

export default DateHelper;

