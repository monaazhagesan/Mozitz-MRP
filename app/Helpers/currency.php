<?php

if (!function_exists('currency_symbol')) {
    function currency_symbol($code)
    {
        static $symbols = [
            'USD' => '$', 'EUR' => '€', 'GBP' => '£', 'INR' => '₹', 'JPY' => '¥',
            'CNY' => '¥', 'AUD' => 'A$', 'CAD' => 'C$', 'CHF' => 'CHF', 'HKD' => 'HK$',
            'NZD' => 'NZ$', 'SGD' => 'S$', 'ZAR' => 'R', 'AED' => 'د.إ', 'SAR' => '﷼',
            'QAR' => '﷼', 'KWD' => 'KD', 'BHD' => '.د.ب', 'OMR' => '﷼', 'EGP' => '£',
            'PKR' => '₨', 'BDT' => '৳', 'LKR' => 'Rs', 'NPR' => '₨', 'THB' => '฿',
            'MYR' => 'RM', 'IDR' => 'Rp', 'PHP' => '₱', 'KRW' => '₩', 'VND' => '₫',
            'RUB' => '₽', 'UAH' => '₴', 'TRY' => '₺', 'BRL' => 'R$', 'MXN' => '$',
            'ARS' => '$', 'CLP' => '$', 'COP' => '$', 'PEN' => 'S/', 'NGN' => '₦',
            'KES' => 'KSh', 'GHS' => '₵', 'TZS' => 'TSh', 'UGX' => 'USh', 'MAD' => 'د.م.',
            'DZD' => 'دج', 'TND' => 'د.ت', 'ILS' => '₪', 'CZK' => 'Kč', 'PLN' => 'zł',
            'HUF' => 'Ft', 'SEK' => 'kr', 'NOK' => 'kr', 'DKK' => 'kr', 'ISK' => 'kr',
            'RON' => 'lei', 'BGN' => 'лв', 'HRK' => 'kn', 'RSD' => 'дин.', 'ALL' => 'L',
            'MKD' => 'ден', 'GEL' => '₾', 'AZN' => '₼', 'AMD' => '֏', 'BYN' => 'Br',
            'KZT' => '₸', 'UZS' => "so'm", 'MNT' => '₮', 'LAK' => '₭', 'KHR' => '៛',
            'MMK' => 'K', 'IRR' => '﷼', 'IQD' => 'ع.د', 'JOD' => 'د.ا', 'LBP' => '£',
            'SYP' => '£', 'YER' => '﷼', 'JMD' => 'J$', 'TTD' => 'TT$', 'BBD' => 'Bds$',
            'BSD' => 'B$', 'FJD' => 'FJ$', 'XAF' => 'FCFA', 'XOF' => 'CFA', 'XPF' => '₣',
            'BWP' => 'P', 'NAD' => 'N$', 'MUR' => '₨', 'SCR' => '₨', 'MZN' => 'MT',
            'AOA' => 'Kz', 'ETB' => 'Br', 'RWF' => 'RF', 'SOS' => 'Sh', 'SDG' => 'ج.س.',
            'TMT' => 'T', 'GMD' => 'D', 'KYD' => '$', 'BMD' => '$', 'BZD' => 'BZ$',
            'GTQ' => 'Q', 'HNL' => 'L', 'NIO' => 'C$', 'PYG' => '₲', 'UYU' => '$U',
            'BOB' => 'Bs', 'CUP' => '$', 'DOP' => 'RD$', 'HTG' => 'G', 'SLL' => 'Le',
            'LRD' => '$', 'GNF' => 'FG', 'CDF' => 'FC', 'XCD' => '$'
        ];

        return $symbols[$code] ?? $code;
    }
}