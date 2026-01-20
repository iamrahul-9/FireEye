import { Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { FileDown, FileText, Table, FileSpreadsheet } from 'lucide-react'
import { LiquidButton } from './Liquid'

type ExportMenuProps = {
    onExportCSV: () => void
    onExportExcel: () => void
    onExportPDF: () => void
    label?: string
    direction?: 'up' | 'down'
}

export default function ExportMenu({ onExportCSV, onExportExcel, onExportPDF, label, direction = 'down' }: ExportMenuProps) {
    return (
        <Menu as="div" className="relative inline-block text-left">
            <div>
                <Menu.Button as="div" onClick={(e) => e.stopPropagation()}>
                    <button
                        className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-sm font-medium transition-colors"
                    >
                        <FileDown size={16} />
                        {label || 'Download'}
                    </button>
                    {/* Mobile Icon Only */}
                    <button className="sm:hidden p-2 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-500">
                        <FileDown size={20} />
                    </button>
                </Menu.Button>
            </div>
            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className={`absolute right-0 w-48 divide-y divide-gray-100 dark:divide-white/10 rounded-xl bg-white dark:bg-[#1a1a1a] shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 border border-gray-200 dark:border-white/10 ${direction === 'up' ? 'bottom-full mb-2 origin-bottom-right' : 'mt-2 origin-top-right'
                    }`}>
                    <div className="px-1 py-1">
                        <Menu.Item>
                            {({ active }) => (
                                <button
                                    onClick={onExportCSV}
                                    className={`${active ? 'bg-primary/10 text-primary' : 'text-gray-900 dark:text-gray-200'
                                        } group flex w-full items-center rounded-lg px-2 py-2 text-sm transition-colors`}
                                >
                                    <Table className="mr-2 h-4 w-4" aria-hidden="true" />
                                    Download as CSV
                                </button>
                            )}
                        </Menu.Item>
                        <Menu.Item>
                            {({ active }) => (
                                <button
                                    onClick={onExportExcel}
                                    className={`${active ? 'bg-primary/10 text-primary' : 'text-gray-900 dark:text-gray-200'
                                        } group flex w-full items-center rounded-lg px-2 py-2 text-sm transition-colors`}
                                >
                                    <FileSpreadsheet className="mr-2 h-4 w-4" aria-hidden="true" />
                                    Download as Excel
                                </button>
                            )}
                        </Menu.Item>
                        <Menu.Item>
                            {({ active }) => (
                                <button
                                    onClick={onExportPDF}
                                    className={`${active ? 'bg-primary/10 text-primary' : 'text-gray-900 dark:text-gray-200'
                                        } group flex w-full items-center rounded-lg px-2 py-2 text-sm transition-colors`}
                                >
                                    <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                                    Download as PDF
                                </button>
                            )}
                        </Menu.Item>
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    )
}
