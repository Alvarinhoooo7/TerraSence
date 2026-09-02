export default function formatISODate(isoDate) {
    if (!isoDate) {
        return 'No data'
    }
    const date = new Date(isoDate);
    const options = { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        hour12: false, 
        timeZone: 'America/Santiago' 
    };
    const formattedDate = date.toLocaleString('en-GB', options);
    return formattedDate.replace(',', ' -');
}

export function checkPasswordFormat(password) {
    const minLength = 8;
    const lowercase = /[a-z]/;
    const uppercase = /[A-Z]/;
    const specialChar = /[\^$*.()[\]{}?!"!@#%&/\\,><':;|_~`+=-]/;

    return (
        password.length >= minLength &&
        lowercase.test(password) &&
        uppercase.test(password) &&
        specialChar.test(password)
    );
}