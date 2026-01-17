export const isEmpty = (value) => {
    if (value == null) {
        return true;
    }

    if (typeof value === "string" && value.trim().length === 0) {
        return true;
    }
    
    
    return false;
}