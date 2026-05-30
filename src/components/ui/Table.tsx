import React from 'react';
import { cn } from '../../lib/utils';

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto custom-scrollbar rounded-lg border border-border/40 bg-card">
      <table ref={ref} className={cn("w-full caption-bottom text-sm border-collapse", className)} {...props} />
    </div>
  )
);
Table.displayName = "Table";

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("[&_tr]:border-b border-border/50 bg-muted/40", className)} {...props} />
  )
);
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  )
);
TableBody.displayName = "TableBody";

export const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot ref={ref} className={cn("border-t border-border bg-muted/50 font-medium [&>tr]:last:border-b-0", className)} {...props} />
  )
);
TableFooter.displayName = "TableFooter";

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b border-border/30 transition-colors hover:bg-muted/10 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
);
TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-12 px-4 text-left align-middle font-semibold text-muted-foreground [&:has([role=checkbox])]:pr-0 uppercase tracking-wider text-xs",
        className
      )}
      {...props}
    />
  )
);
TableHead.displayName = "TableHead";

export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)} {...props} />
  )
);
TableCell.displayName = "TableCell";

// Table Loading State
interface TableLoaderProps {
  columnsCount: number;
  rowsCount?: number;
}
export const TableLoader: React.FC<TableLoaderProps> = ({ columnsCount, rowsCount = 4 }) => {
  return (
    <>
      {Array.from({ length: rowsCount }).map((_, rIdx) => (
        <TableRow key={`row-load-${rIdx}`} className="animate-pulse">
          {Array.from({ length: columnsCount }).map((_, cIdx) => (
            <TableCell key={`cell-load-${cIdx}`}>
              <div className="h-4 bg-slate-200 rounded-md w-3/4" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
};

// Table Empty State
interface TableEmptyProps {
  columnsCount: number;
  message?: string;
  description?: string;
}
export const TableEmpty: React.FC<TableEmptyProps> = ({ 
  columnsCount, 
  message = "No records found", 
  description = "There is no data to display in this list." 
}) => {
  return (
    <TableRow>
      <TableCell colSpan={columnsCount} className="h-48 text-center">
        <div className="flex flex-col items-center justify-center space-y-2 py-6">
          <span className="text-3xl">📁</span>
          <p className="font-semibold text-foreground text-sm">{message}</p>
          <p className="text-xs text-muted-foreground max-w-xs">{description}</p>
        </div>
      </TableCell>
    </TableRow>
  );
};
