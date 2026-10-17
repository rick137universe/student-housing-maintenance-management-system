import actions from './student-docs.json';
import modules from './student-modules.json';

export const studentPages = modules.flatMap(module => [module, ...actions.filter(action => action.feature === module.feature)]);
