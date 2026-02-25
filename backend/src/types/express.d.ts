/**
 * Express Request augmentation.
 *
 * Adds `req.user`, `req.dataScope`, `req.propertyDoc`, `req.tenantDoc`,
 * `req.rentPaymentDoc`, `req.transactionDoc`, and `req.ownerPaymentDoc`
 * to the Express Request interface so TypeScript knows about these properties
 * set by our middleware.
 *
 * `req.user`             — set by authMiddleware after verifying the Bearer token
 * `req.dataScope`        — set by dataScopeMiddleware; used in route handlers to
 *                          filter Mongoose queries (empty object = no filter for admins)
 * `req.propertyDoc`      — set by propertyOwnerMiddleware; the verified property document
 * `req.tenantDoc`        — set by tenantAccessMiddleware; the verified tenant document
 * `req.rentPaymentDoc`   — set by rentPaymentAccessMiddleware; the verified payment document
 * `req.transactionDoc`   — set by transactionOwnerMiddleware; the verified transaction document
 * `req.ownerPaymentDoc`  — set by ownerPaymentAccessMiddleware; the verified owner payment document
 * `req.maintenanceDoc`   — set by maintenanceAccessMiddleware; the verified maintenance request doc
 * `req.documentDoc`      — set by documentAccessMiddleware; the verified document record
 */

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: import('../models/user.model').UserRole;
      };
      /**
       * Mongoose query filter injected by dataScopeMiddleware.
       * Admins: {} (no restriction)
       * Staff:  { userId: <id> }
       */
      dataScope?: Record<string, unknown>;
      /**
       * Property document attached by propertyOwnerMiddleware.
       * Available on all /:id property routes after ownership is verified.
       */
      propertyDoc?: import('../models/property.model').IProperty & {
        _id: import('mongoose').Types.ObjectId;
        images: Array<import('../models/property.model').IPropertyImage>;
      };
      /**
       * Tenant document attached by tenantAccessMiddleware.
       * Available on all /:id tenant routes after access is verified.
       */
      tenantDoc?: import('../models/tenant.model').ITenant & {
        _id: import('mongoose').Types.ObjectId;
      };
      /**
       * Rent payment document attached by rentPaymentAccessMiddleware.
       * Available on all /:id rent-payment routes after access is verified.
       */
      rentPaymentDoc?: import('../models/rent-payment.model').IRentPayment & {
        _id: import('mongoose').Types.ObjectId;
      };
      /**
       * Transaction document attached by transactionOwnerMiddleware.
       * Available on all /:id transaction routes after ownership is verified.
       */
      transactionDoc?: import('../models/transaction.model').ITransaction & {
        _id: import('mongoose').Types.ObjectId;
      };
      /**
       * Owner payment document attached by ownerPaymentAccessMiddleware.
       * Available on all /:id owner-payment routes after access is verified.
       */
      ownerPaymentDoc?: import('../models/owner-payment.model').IOwnerPayment & {
        _id: import('mongoose').Types.ObjectId;
      };
      /**
       * Maintenance request document attached by maintenanceAccessMiddleware.
       * Available on all /:id maintenance routes after access is verified.
       */
      maintenanceDoc?: import('../models/maintenance-request.model').IMaintenanceRequest & {
        _id: import('mongoose').Types.ObjectId;
      };
      /**
       * Document record attached by documentAccessMiddleware.
       * Available on all /:id document routes after access is verified.
       */
      documentDoc?: import('../models/document.model').IDocument & {
        _id: import('mongoose').Types.ObjectId;
      };
      /**
       * Contract document attached by contractAccessMiddleware.
       * Available on all /:id contract routes after access is verified.
       */
      contractDoc?: import('../models/contract.model').IContract & {
        _id: import('mongoose').Types.ObjectId;
      };
    }
  }
}

// Required to make this file a module (not a global script)
export {};
