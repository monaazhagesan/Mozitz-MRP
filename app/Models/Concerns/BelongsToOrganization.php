<?php

namespace App\Models\Concerns;

use App\Models\Scopes\OrganizationScope;
use Illuminate\Support\Facades\Auth;

/**
 * Applied to every model whose table carries an `organization_id` column.
 * Automatically scopes every query to the authenticated user's organization
 * (so logins that share an organization see the same data, while logins in
 * different organizations still can't see each other's) and auto-stamps
 * `organization_id` on create, matching the existing `user_id` attribution
 * that individual controllers already set by hand.
 */
trait BelongsToOrganization
{
    protected static function bootBelongsToOrganization(): void
    {
        static::addGlobalScope(new OrganizationScope);

        static::creating(function ($model) {
            if (empty($model->organization_id) && Auth::check()) {
                $model->organization_id = Auth::user()->organization_id;
            }
        });
    }
}
