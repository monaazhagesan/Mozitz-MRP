<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Auth\Passwords\CanResetPassword;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable, CanResetPassword;

    protected $fillable = [
        'email',
        'password',
        'organization_id',
        'role_id',
        'is_active',
        'first_name',
        'last_name',
        'company',
         'country',
         'currency',

         'phone',
    'gstin',
    'pan',
    'address',
    'bank_account_name',
    'bank_account_number',
    'ifsc',
    'account_type',
    'bank_name',
    'branch',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'is_active' => 'boolean',
    ];

    protected $appends = ['permissions'];

    /**
     * Flat permission-key list for the frontend's hasPermission() helper.
     */
    public function getPermissionsAttribute(): array
    {
        return $this->effectivePermissionKeys();
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function departments()
    {
        return $this->belongsToMany(Department::class, 'department_user');
    }

    public function permissionOverrides()
    {
        return $this->hasMany(UserPermissionOverride::class);
    }

    public function isSuperAdmin(): bool
    {
        return (bool) $this->role?->is_system;
    }

    /**
     * A role's permissions, with this user's individual grant/revoke
     * exceptions applied on top — `granted = true` adds a permission the
     * role doesn't have, `granted = false` removes one the role does have.
     * Super Admin bypasses overrides entirely and always gets the full
     * catalog, so a stray revoke row can never lock out an org's own admin.
     * Deliberately not cached: this is called at most a handful of times
     * per request, and caching it on the instance previously went stale
     * whenever overrides were written and then re-read on the same $user
     * object within one request (e.g. right after TeamController's
     * updatePermissions() saves and reloads it).
     */
    public function effectivePermissionKeys(): array
    {
        if ($this->isSuperAdmin()) {
            return Permission::pluck('key')->all();
        }

        $keys = collect($this->role?->permissions->pluck('key') ?? [])
            ->mapWithKeys(fn ($key) => [$key => true]);

        foreach ($this->permissionOverrides as $override) {
            if (!$override->permission) {
                continue;
            }
            if ($override->granted) {
                $keys[$override->permission->key] = true;
            } else {
                $keys->forget($override->permission->key);
            }
        }

        return $keys->keys()->values()->all();
    }

    public function hasPermission(string $key): bool
    {
        return in_array($key, $this->effectivePermissionKeys(), true);
    }
}
