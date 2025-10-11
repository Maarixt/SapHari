// Supabase Auth Hook for Role Injection
// This function runs on every auth event and injects user roles into JWT claims

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse the request body
    const { type, record, old_record } = await req.json()

    console.log('Auth hook triggered:', { type, user_id: record?.id })

    // Handle different auth events
    switch (type) {
      case 'user.created':
        await handleUserCreated(supabaseClient, record)
        break
      
      case 'user.updated':
        await handleUserUpdated(supabaseClient, record, old_record)
        break
      
      case 'user.deleted':
        await handleUserDeleted(supabaseClient, record)
        break
      
      case 'user.signed_in':
        await handleUserSignedIn(supabaseClient, record)
        break
      
      default:
        console.log('Unhandled auth event type:', type)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Auth hook error:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

// Handle new user creation
async function handleUserCreated(supabaseClient: any, user: any) {
  console.log('New user created:', user.id)
  
  try {
    // Create default user role
    const { error } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: 'user',
        tenant_id: null, // Default tenant
        is_active: true
      })

    if (error) {
      console.error('Failed to create default user role:', error)
    } else {
      console.log('Default user role created for:', user.id)
    }

    // Log audit event
    await logAuditEvent(supabaseClient, {
      user_id: user.id,
      action: 'user_created',
      table_name: 'auth.users',
      record_id: user.id,
      new_values: { email: user.email, role: 'user' }
    })

  } catch (error) {
    console.error('Error in handleUserCreated:', error)
  }
}

// Handle user updates
async function handleUserUpdated(supabaseClient: any, user: any, oldUser: any) {
  console.log('User updated:', user.id)
  
  try {
    // Log audit event for user updates
    await logAuditEvent(supabaseClient, {
      user_id: user.id,
      action: 'user_updated',
      table_name: 'auth.users',
      record_id: user.id,
      old_values: oldUser,
      new_values: user
    })

  } catch (error) {
    console.error('Error in handleUserUpdated:', error)
  }
}

// Handle user deletion
async function handleUserDeleted(supabaseClient: any, user: any) {
  console.log('User deleted:', user.id)
  
  try {
    // Deactivate all user roles
    const { error } = await supabaseClient
      .from('user_roles')
      .update({ is_active: false })
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to deactivate user roles:', error)
    }

    // Log audit event
    await logAuditEvent(supabaseClient, {
      user_id: user.id,
      action: 'user_deleted',
      table_name: 'auth.users',
      record_id: user.id,
      old_values: { email: user.email }
    })

  } catch (error) {
    console.error('Error in handleUserDeleted:', error)
  }
}

// Handle user sign in
async function handleUserSignedIn(supabaseClient: any, user: any) {
  console.log('User signed in:', user.id)
  
  try {
    // Get user roles
    const { data: roles, error } = await supabaseClient
      .from('user_roles')
      .select('role, tenant_id, expires_at')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (error) {
      console.error('Failed to get user roles:', error)
      return
    }

    // Check for expired roles
    const now = new Date()
    const activeRoles = roles?.filter(role => 
      !role.expires_at || new Date(role.expires_at) > now
    ) || []

    // Update user metadata with roles
    const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          roles: activeRoles,
          primary_role: activeRoles[0]?.role || 'user',
          tenant_id: activeRoles[0]?.tenant_id || null
        }
      }
    )

    if (updateError) {
      console.error('Failed to update user metadata:', updateError)
    } else {
      console.log('User metadata updated with roles:', activeRoles)
    }

    // Log audit event
    await logAuditEvent(supabaseClient, {
      user_id: user.id,
      action: 'user_signed_in',
      table_name: 'auth.users',
      record_id: user.id,
      new_values: { 
        email: user.email, 
        roles: activeRoles,
        sign_in_time: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error in handleUserSignedIn:', error)
  }
}

// Log audit events
async function logAuditEvent(supabaseClient: any, event: any) {
  try {
    const { error } = await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: event.user_id,
        action: event.action,
        table_name: event.table_name,
        record_id: event.record_id,
        old_values: event.old_values,
        new_values: event.new_values
      })

    if (error) {
      console.error('Failed to log audit event:', error)
    }
  } catch (error) {
    console.error('Error logging audit event:', error)
  }
}

// Helper function to get user roles
export async function getUserRoles(supabaseClient: any, userId: string) {
  try {
    const { data: roles, error } = await supabaseClient
      .from('user_roles')
      .select('role, tenant_id, expires_at')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (error) {
      console.error('Failed to get user roles:', error)
      return []
    }

    // Filter out expired roles
    const now = new Date()
    return roles?.filter(role => 
      !role.expires_at || new Date(role.expires_at) > now
    ) || []

  } catch (error) {
    console.error('Error getting user roles:', error)
    return []
  }
}

// Helper function to check if user has role
export async function userHasRole(supabaseClient: any, userId: string, role: string, tenantId?: string) {
  try {
    const { data, error } = await supabaseClient
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', role)
      .eq('is_active', true)
      .eq(tenantId ? 'tenant_id' : 'tenant_id', tenantId || null)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Failed to check user role:', error)
      return false
    }

    return !!data

  } catch (error) {
    console.error('Error checking user role:', error)
    return false
  }
}

// Helper function to grant role to user
export async function grantRoleToUser(supabaseClient: any, userId: string, role: string, tenantId?: string, expiresAt?: Date) {
  try {
    const { error } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: userId,
        role: role,
        tenant_id: tenantId || null,
        expires_at: expiresAt?.toISOString() || null,
        is_active: true
      })

    if (error) {
      console.error('Failed to grant role:', error)
      return false
    }

    return true

  } catch (error) {
    console.error('Error granting role:', error)
    return false
  }
}

// Helper function to revoke role from user
export async function revokeRoleFromUser(supabaseClient: any, userId: string, role: string, tenantId?: string) {
  try {
    const { error } = await supabaseClient
      .from('user_roles')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('role', role)
      .eq(tenantId ? 'tenant_id' : 'tenant_id', tenantId || null)

    if (error) {
      console.error('Failed to revoke role:', error)
      return false
    }

    return true

  } catch (error) {
    console.error('Error revoking role:', error)
    return false
  }
}
