declare module 'htmldiff-js' {
    const htmldiff: {
        execute: (beforeHtml: string, afterHtml: string) => string;
    };

    export default htmldiff;
}
