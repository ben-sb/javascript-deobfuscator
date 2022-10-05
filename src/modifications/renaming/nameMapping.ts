export default class NameMapping {
    private readonly mappings: Map<string, string>;
    private readonly children: NameMapping[];

    /**
     * Creates a new name mapping.
     */
    constructor() {
        this.mappings = new Map<string, string>();
        this.children = [];
    }

    /**
     * Adds a new mapping.
     * @param name The original variable name.
     * @param newName The new variable name.
     */
    addMapping(name: string, newName: string): void {
        this.mappings.set(newName, name);
    }

    /**
     * Adds a child name mapping.
     * @param child The child name mapping.
     */
    addChild(child: NameMapping): void {
        this.children.push(child);
    }

    /**
     * Serializes the mapping to an object (suitable for JSON.stringify).
     * @returns The mapping object.
     */
    serialize(): any {
        const data: any = {
            children: this.children.map(c => c.serialize())
        };

        for (const [newName, name] of this.mappings) {
            data[newName] = name;
        }

        return data;
    }
}
