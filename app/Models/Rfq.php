<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use App\Models\User;

class Rfq extends Model
{
    use BelongsToOrganization;
    use HasFactory;

    protected $table = 'rfqs';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'rfq_number',
        'title',
        'status',
        'payment_terms',
        'delivery_location',
        'notes',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            $model->id = (string) Str::uuid();
        });
    }

     const STATUS_DRAFT  = 'draft';
    const STATUS_SENT   = 'sent';
    const STATUS_VIEWED = 'viewed';
    const STATUS_QUOTED = 'quoted';
    const STATUS_CLOSED = 'closed';

    public static function allowedStatuses()
    {
        return [
            self::STATUS_DRAFT,
            self::STATUS_SENT,
            self::STATUS_VIEWED,
            self::STATUS_QUOTED,
            self::STATUS_CLOSED,
        ];
    }
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

     public function items()
    {
        return $this->hasMany(RfqItem::class, 'rfq_id');
    }

    // RFQ has many vendors
    public function vendors()
    {
        return $this->hasMany(RfqVendor::class, 'rfq_id');
    }
}
