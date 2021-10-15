export class StoreName{
    constructor(private readonly name: string) {
    }
    value(): string{
        return this.name;
    }
}
