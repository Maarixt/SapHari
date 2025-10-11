-- Add RESTRICTIVE DELETE policy to audit_logs to prevent tampering
-- This ensures audit logs cannot be deleted under any circumstances
CREATE POLICY "audit_logs_prevent_deletion"
ON audit_logs
FOR DELETE
USING (false);

-- Add comment explaining the policy
COMMENT ON POLICY "audit_logs_prevent_deletion" ON audit_logs IS 
'Prevents all deletion of audit logs to maintain integrity of audit trail. Audit logs are immutable by design.';