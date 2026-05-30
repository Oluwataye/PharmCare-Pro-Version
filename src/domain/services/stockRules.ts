import { InventoryItem } from '../entities/models';

export const stockRules = {
  /**
   * Enforces rules for requesting stock transfers between branches.
   */
  canRequestTransfer: (quantity: number, item: InventoryItem | undefined): { allowed: boolean; reason?: string } => {
    if (quantity <= 0) {
      return { allowed: false, reason: "Transfer quantity must be greater than zero." };
    }
    if (!item) {
      return { allowed: false, reason: "Product does not exist in the source branch inventory." };
    }
    if (item.quantity < quantity) {
      return { 
        allowed: false, 
        reason: `Insufficient stock. The source branch (${item.branchId}) only contains ${item.quantity} available units.` 
      };
    }
    return { allowed: true };
  },

  /**
   * Validates that the route of transfer is sensible (e.g. not sending back to itself).
   */
  isValidRoute: (sourceBranchId: string, destinationBranchId: string): { allowed: boolean; reason?: string } => {
    if (sourceBranchId === destinationBranchId) {
      return { allowed: false, reason: "Source and Destination branches cannot be identical." };
    }
    return { allowed: true };
  },

  /**
   * Calculates what percentage a branch's or region's sales contributes to the total.
   */
  calculateContributionPercentage: (value: number, total: number): number => {
    if (total <= 0) return 0;
    return Number(((value / total) * 100).toFixed(1));
  }
};
