<?php

namespace App\Http\Controllers;

use App\Models\MoveTransaction;
use App\Models\Operator;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OperatorController extends Controller
{
    public function index(Request $request)
    {
        $operators = Operator::where('user_id', auth()->id())
            ->orderBy('name')
            ->get();

        return response()->json($operators);
    }

    public function show($id)
    {
        $operator = Operator::where('user_id', auth()->id())->findOrFail($id);

        return response()->json($operator);
    }

    public function store(Request $request)
    {
        try {
            $data = $this->validateData($request);
            $data['id'] = (string) Str::uuid();
            $data['user_id'] = auth()->id();

            if (empty($data['employee_code'])) {
                $data['employee_code'] = $this->generateEmployeeCode();
            }

            $data['is_active'] = $request->has('is_active')
                ? filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN)
                : true;

            $operator = Operator::create($data);

            return response()->json($operator, 201);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation Failed',
                'errors' => $e->errors(),
            ], 422);
        }
    }

    public function update(Request $request, $id)
    {
        $operator = Operator::where('user_id', auth()->id())->findOrFail($id);

        try {
            $data = $this->validateData($request, $id);

            if (empty($data['employee_code'])) {
                $data['employee_code'] = $operator->employee_code;
            }

            if ($request->has('is_active')) {
                $data['is_active'] = filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN);
            }

            $operator->update($data);

            return response()->json($operator);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation Failed',
                'errors' => $e->errors(),
            ], 422);
        }
    }

    public function destroy($id)
    {
        $operator = Operator::where('user_id', auth()->id())->findOrFail($id);

        // Business rule: keep an operator's historical Shop Floor activity
        // attributable — don't let the name disappear out from under
        // already-logged move_transactions rows.
        $usage = MoveTransaction::where('user_id', auth()->id())
            ->where('operator_name', $operator->name)
            ->count();

        if ($usage > 0) {
            return response()->json([
                'message' => "Cannot delete: \"{$operator->name}\" appears on {$usage} recorded Shop Floor transaction(s). Mark them inactive instead.",
            ], 409);
        }

        $operator->delete();

        return response()->json(['message' => 'Operator deleted successfully']);
    }

    private function generateEmployeeCode(): string
    {
        $last = Operator::where('user_id', auth()->id())
            ->where('employee_code', 'like', 'OP-%')
            ->orderByRaw('CAST(SUBSTRING(employee_code, 4) AS UNSIGNED) DESC')
            ->first();

        $lastNumber = 0;
        if ($last && preg_match('/-(\d+)$/', $last->employee_code, $m)) {
            $lastNumber = (int) $m[1];
        }

        return 'OP-' . str_pad((string) ($lastNumber + 1), 3, '0', STR_PAD_LEFT);
    }

    private function validateData(Request $request, $id = null)
    {
        return $request->validate([
            'name' => [
                'required',
                'string',
                'max:150',
                Rule::unique('operators', 'name')
                    ->ignore($id)
                    ->where('user_id', auth()->id()),
            ],
            'employee_code' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('operators', 'employee_code')
                    ->ignore($id)
                    ->where('user_id', auth()->id()),
            ],
            'department' => 'nullable|string|max:100',
        ]);
    }
}
