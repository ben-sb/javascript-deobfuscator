import * as Shift from "shift-ast";
import Modification from "../../modification";
import { traverse } from "../../helpers/traverse";
import ExecutedFunction from "./executedFunction";
import Scope from "./scope";
import TraversalHelper from "../../helpers/traversalHelper";

export default class FunctionExecutor extends Modification {
  private readonly scopeTypes = new Set(["Block", "FunctionBody"]);
  private readonly functionTypes = new Set([
    "FunctionDeclaration",
    "FunctionExpression",
    "ArrowExpression",
  ]);
  private globalScope: Scope;
  private foundExecutedFunction: boolean;

  /**
   * Creates a new modification.
   * @param ast The AST.
   */
  constructor(ast: Shift.Script) {
    super("Execute Functions", ast);
    this.globalScope = new Scope(ast);
    this.foundExecutedFunction = false;
  }

  /**
   * Executes the modification.
   */
  execute(): void {
    this.findExecutedFunctions();
    if (this.foundExecutedFunction) {
      this.findAliases();
      this.replaceFunctionCalls();
    }
  }

  /**
   * Finds all the executed functions.
   */
  private findExecutedFunctions(): void {
    const self = this;
    let scope = this.globalScope;

    traverse(this.ast, {
      enter(node: Shift.Node, parent: Shift.Node) {
        if (
          self.functionTypes.has(node.type) &&
          (node as any).body.directives
        ) {
          const directive = (node as any).body.directives.find(
            (d: Shift.Directive) => d.rawValue.startsWith("#execute")
          );
          if (directive) {
            let name: string | undefined;
            if (node.type == "FunctionDeclaration") {
              name = node.name.name;
            } else {
              const result = directive.rawValue.match(/#execute\[name=(.*)\]/);
              if (result) {
                name = result[1];
              }
            }

            const executedFunction = new ExecutedFunction(node as any, name);
            scope.addExecutedFunction(executedFunction);

            TraversalHelper.removeNode(parent, node);

            if (!self.foundExecutedFunction) {
              self.foundExecutedFunction = true;
            }
          }
        }
        if (self.scopeTypes.has(node.type)) {
          scope = new Scope(node, scope);
        }
      },
      leave(node: Shift.Node) {
        if (node == scope.node && scope.parent) {
          scope = scope.parent;
        }
      },
    });
  }

  /**
   * Finds aliases for executed functions.
   */
  private findAliases(): void {
    const self = this;
    let scope = this.globalScope;

    traverse(this.ast, {
      enter(node: Shift.Node, parent: Shift.Node) {
        if (self.scopeTypes.has(node.type)) {
          scope = scope.children.get(node) as Scope;
        }
        if (self.isVariableReassignment(node)) {
          const name = (node as any).init.name;
          const newName = (node as any).binding.name;

          const executedFunction = scope.findExecutedFunction(name);
          if (executedFunction) {
            scope.addAlias(executedFunction, newName);
            TraversalHelper.removeNode(parent, node);
          }
        }
      },
      leave(node: Shift.Node) {
        if (node == scope.node && scope.parent) {
          scope = scope.parent;
        }
      },
    });
  }

  /**
   * Finds and replaces all calls of executed functions.
   */
  private replaceFunctionCalls(): void {
    const self = this;
    let scope = this.globalScope;

    traverse(this.ast, {
      enter(node: Shift.Node, parent: Shift.Node) {
        if (self.scopeTypes.has(node.type)) {
          scope = scope.children.get(node) as Scope;
        }
        if (
          node.type == "CallExpression" &&
          node.callee.type == "IdentifierExpression"
        ) {
          const executedFunction = scope.findExecutedFunction(node.callee.name);
          if (executedFunction) {
            const result = executedFunction.getCall(node.arguments);
            const replacement = self.literalValueToNode(result);

            if (replacement) {
              TraversalHelper.replaceNode(parent, node, replacement);
            }
          }
        }
      },
      leave(node: Shift.Node) {
        if (node == scope.node && scope.parent) {
          scope = scope.parent;
        }
      },
    });
  }

  /**
   * Attempts to convert a literal value to an AST node.
   * @param value The literal value.
   * @returns The AST node or null.
   */
  private literalValueToNode(value: any): Shift.Node | null {
    switch (typeof value) {
      case "string":
        return new Shift.LiteralStringExpression({
          value: value,
        });

      case "number":
        return new Shift.LiteralNumericExpression({
          value: value,
        });

      case "boolean":
        return new Shift.LiteralBooleanExpression({
          value: value,
        });

      default:
        return null;
    }
  }

  /**
   * Returns whether a node is a variable reassignment.
   * @param node The AST node.
   * @returns Whether.
   */
  private isVariableReassignment(node: Shift.Node): boolean {
    return (
      node.type == "VariableDeclarator" &&
      node.binding.type == "BindingIdentifier" &&
      node.init != null &&
      node.init.type == "IdentifierExpression"
    );
  }
}
