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
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }
}
