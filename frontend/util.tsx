export function expose(name, obj) {
    Object.defineProperty(window, name, {
        get() {
            let err = new Error()
            if (/<anonymous>/.test(err.stack)) {
                return obj
            } else {
                throw new Error(
                    `Accessing exposed global outside of development console: ` +
                        `Did you forget to import ${name}?`
                )
            }
        },
    })
}
