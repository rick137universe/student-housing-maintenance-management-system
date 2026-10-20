import type {ReactNode} from 'react';

// Reuse the mother template's warning badge, colors, spacing and typography.
export function StudentWarning({children,id}:{children:ReactNode;id?:string}){
 return <div className="docs-info-content formatted-text" data-dorma-warning><div className="notice warning" role="alert" id={id}><p>{children}</p></div></div>;
}
