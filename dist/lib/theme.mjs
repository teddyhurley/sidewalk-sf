export const themeOrder=['system','light','dark'];
export const validTheme=value=>themeOrder.includes(value)?value:'system';
export const nextTheme=value=>themeOrder[(themeOrder.indexOf(validTheme(value))+1)%themeOrder.length];
export const resolveTheme=(preference,systemDark)=>validTheme(preference)==='system'?(systemDark?'dark':'light'):preference;
