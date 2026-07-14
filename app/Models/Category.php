<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use App\Models\User;


class Category extends Model
{
    use BelongsToOrganization;
    protected $table = 'categories';
    protected $primaryKey = 'id';
    public $incrementing = false; // We'll use UUIDs
    public $timestamps = false;

    protected $fillable = [
        'id',
        'user_id',
        'name',
        'created_at'
    ];

    // Automatically generate UUID if id is not provided
    protected static function booted()
    {
        static::creating(function ($category) {
            if (!$category->id) {
                $category->id = (string) Str::uuid();
            }
            if (!$category->created_at) {
                $category->created_at = now();
            }
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}