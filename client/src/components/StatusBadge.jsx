import React from 'react';
import { CheckCircle2, Clock, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

export function StatusBadge({ status }) {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'success':
      return (
        <span className="badge badge-success">
          <CheckCircle2 size={12} />
          Completed
        </span>
      );
    case 'processing':
    case 'pending':
      return (
        <span className="badge badge-info">
          <Clock size={12} className="animate-spin" />
          Processing
        </span>
      );
    case 'failed':
      return (
        <span className="badge badge-danger">
          <XCircle size={12} />
          Failed
        </span>
      );
    case 'received':
      return (
        <span className="badge badge-warning">
          <Clock size={12} />
          Received
        </span>
      );
    case 'verified':
      return (
        <span className="badge badge-success">
          <ShieldCheck size={12} />
          HMAC Valid
        </span>
      );
    default:
      return (
        <span className="badge badge-neutral">
          {status || 'Unknown'}
        </span>
      );
  }
}
