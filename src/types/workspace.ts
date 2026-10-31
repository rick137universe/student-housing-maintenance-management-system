/** Page metadata shared by the four workspace shells and document controls. */
export type WorkspacePage={feature:string;group:string;color:number;label:string;id:string;action:string;url:string;description:string};
export type NestedWorkspacePage=WorkspacePage&{parent?:string;kind?:string};
