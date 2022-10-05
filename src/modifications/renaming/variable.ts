import * as Shift from 'shift-ast';

export class Variable {
    name: string;
    type: VariableType;
    declarations: Shift.BindingIdentifier[];
    references: (Shift.IdentifierExpression | Shift.AssignmentTargetIdentifier)[];

    /**
     * Creates a new variable.
     * @param name The variable name.
     * @param type The type of the variable.
     */
    constructor(name: string, type: VariableType) {
        this.name = name;
        this.type = type;
        this.declarations = [];
        this.references = [];
    }

    /**
     * Returns whether the variable is block scoped.
     * @returns Whether.
     */
    isBlockScoped(): boolean {
        return blockScopedTypes.has(this.type);
    }

    /**
     * Renames the variable.
     * @param newName The new variable name.
     */
    rename(newName: string): void {
        for (const declaration of this.declarations) {
            declaration.name = newName;
        }
        for (const reference of this.references) {
            reference.name = newName;
        }
    }
}

export type VariableType = 'const' | 'let' | 'var' | undefined;

export const blockScopedTypes = new Set<VariableType>(['const', 'let']);
