<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

class OrganizationScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        if (!Auth::check()) {
            // No request-bound user (console commands, scheduled jobs,
            // migrations) — nothing to scope by, leave unrestricted, same as
            // the manual user_id scoping this replaces never applied outside
            // HTTP controllers either.
            return;
        }

        if (Auth::user()->organization_id) {
            $builder->where($model->getTable().'.organization_id', Auth::user()->organization_id);
            return;
        }

        // Authenticated but somehow has no organization (shouldn't happen —
        // every user gets one at registration or via the backfill migration
        // — but fail closed rather than silently exposing every
        // organization's data if it ever does).
        $builder->whereRaw('1 = 0');
    }
}
