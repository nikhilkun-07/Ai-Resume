export const validateEmail = (email) => {
    const re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return re.test(email);
};

export const validatePassword = (password) => {
    return password && password.length >= 6;
};

export const validateName = (name) => {
    return name && name.trim().length >= 2;
};

export const validateUrl = (url) => {
    if (!url) return true;
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

export const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>]/g, '');
};