export const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
};

export const calculatePercentage = (value, total) => {
    if (!total) return 0;
    return Math.round((value / total) * 100);
};

export const truncateText = (text, length = 100) => {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
};

export const generateRandomId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};