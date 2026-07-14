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
     * Flat permission-key list for the frontend's hasPermission() helper —
     * uses the already-loaded `role.permissions` relation when present
     * (AuthController eager-loads it) rather than firing an extra query.
     */
    public function getPermissionsAttribute(): array
    {
        if (!$this->role) {
            return [];
        }

        return $this->role->permissions->pluck('key')->values()->all();
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

    public function isSuperAdmin(): bool
    {
        return (bool) $this->role?->is_system;
    }

    /**
     * Super Admin always passes, regardless of whether every permission is
     * actually synced to its pivot row — new permission keys added later
     * are automatically covered without a data migration.
     */
    public function hasPermission(string $key): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        return $this->role?->permissions()->where('key', $key)->exists() ?? false;
    }
}
