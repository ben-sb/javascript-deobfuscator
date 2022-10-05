/**
 * Taken from https://github.com/jsoverson/shift-traverse-js/blob/master/src/index.js
 * All credit goes to jsoverson
 */

import estraverse from 'estraverse';
import Spec from './shiftSpec';

const environment = estraverse.cloneEnvironment();

Object.keys(environment.Syntax)
    .filter(key => key !== 'Property')
    .forEach(key => {
        delete (environment.Syntax as any)[key];
        delete (environment.VisitorKeys as any)[key];
    });

Object.assign(
    environment.Syntax,
    Object.keys(Spec).reduce((result: { [key: string]: string }, key) => {
        result[key] = key;
        return result;
    }, {})
);

Object.assign(
    environment.VisitorKeys,
    Object.keys(Spec).reduce((result: { [key: string]: string }, key) => {
        result[key] = (Spec as any)[key].fields.map((field: any) => field.name);
        return result;
    }, {})
);

const traverse = environment.traverse as any;
const replace = environment.replace as any;
export { traverse, replace };
