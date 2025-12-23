'use client'

import { Search, Filter } from 'lucide-react'

type SearchFilterBarProps = {
    searchValue: string
    onSearchChange: (value: string) => void
    searchPlaceholder?: string
    filterValue: string
    onFilterChange: (value: string) => void
    filterOptions: { label: string; value: string }[]
}

export default function SearchFilterBar({
    searchValue,
    onSearchChange,
    searchPlaceholder = "Search...",
    filterValue,
    onFilterChange,
    filterOptions
}: SearchFilterBarProps) {
    return (
        <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
                <input
                    type="text"
                    className="liquid-input w-full !pl-12"
                    placeholder={searchPlaceholder}
                    value={searchValue}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
            </div>
            <div className="sm:w-48">
                <div className="relative">
                    <select
                        className="liquid-input w-full !pl-12"
                        value={filterValue}
                        onChange={(e) => onFilterChange(e.target.value)}
                    >
                        {filterOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Filter className="h-4 w-4 text-gray-400" />
                    </div>
                </div>
            </div>
        </div>
    )
}
