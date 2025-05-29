'use client'

import { useState, useEffect } from 'react'
import { useFundStore } from '@/store/fund'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Plus, TrendingUp, TrendingDown, DollarSign, PieChart, Trash2, Edit, FileText, RefreshCw } from 'lucide-react'
import type { Transaction } from '@/store/fund'
import { DataManager } from '@/components/DataManager'
import { Label as UILabel } from '@/components/ui/label'

interface TransactionFormData {
	fundCode: string
	fundName: string
	type: '买入' | '卖出'
	date: string
	price: number
	quantity: number
	amount: number
	unitPrice: number
	fee: number
}

export default function FundRecordsPage() {
	const [isHydrated, setIsHydrated] = useState(false)
	const { 
		transactions, 
		holdings, 
		accountSummary, 
		addTransaction, 
		deleteTransaction,
		updateFundPrice,
		updateTransactionFee
	} = useFundStore()
	
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
	const [editingFund, setEditingFund] = useState<string | null>(null)
	const [newPrice, setNewPrice] = useState('')
	const [showDataDialog, setShowDataDialog] = useState(false)
	const [editingFeeId, setEditingFeeId] = useState<string | null>(null)
	const [editingFeeValue, setEditingFeeValue] = useState<string>('')

	// 处理客户端水合
	useEffect(() => {
		setIsHydrated(true)
		// 手动触发 Zustand persist 的水合
		if (typeof window !== 'undefined') {
			useFundStore.persist.rehydrate()
		}
	}, [])

	const form = useForm<TransactionFormData>({
		defaultValues: {
			fundCode: '',
			fundName: '',
			type: '买入',
			date: new Date().toISOString().split('T')[0],
			price: 0,
			quantity: 0,
			amount: 0,
			unitPrice: 0,
			fee: 0
		}
	})

	// 监听价格和数量变化，自动计算交易金额
	const watchPrice = form.watch('price')
	const watchQuantity = form.watch('quantity')
	
	useEffect(() => {
		const amount = watchPrice * watchQuantity
		form.setValue('amount', amount)
	}, [watchPrice, watchQuantity, form])

	// 在水合完成前显示加载状态
	if (!isHydrated) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p className="text-gray-600">加载中...</p>
				</div>
			</div>
		)
	}

	const onSubmit = (data: TransactionFormData) => {
		addTransaction(data)
		toast.success('交易记录添加成功')
		setIsAddDialogOpen(false)
		form.reset()
	}

	const handleDeleteTransaction = (id: string) => {
		deleteTransaction(id)
		toast.success('交易记录删除成功')
	}

	const handleUpdatePrice = (fundCode: string) => {
		const price = parseFloat(newPrice)
		if (price > 0) {
			updateFundPrice(fundCode, price)
			toast.success('基金净值更新成功')
			setEditingFund(null)
			setNewPrice('')
		}
	}

	const handleUpdateFee = (id: string, value: string) => {
		updateTransactionFee(id, parseFloat(value))
		toast.success('手续费更新成功')
		setEditingFeeId(null)
		setEditingFeeValue('')
	}

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('zh-CN', {
			style: 'currency',
			currency: 'CNY'
		}).format(amount)
	}

	const formatPercent = (rate: number) => {
		return `${rate >= 0 ? '+' : ''}${rate.toFixed(2)}%`
	}

	return (
		<div className="min-h-screen bg-gray-50">
			{/* 顶部导航栏 */}
			<div className="bg-white border-b border-gray-200 sticky top-0 z-50">
				<div className="mx-auto max-w-7xl px-4 py-4">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-2xl font-bold text-gray-900">基金投资记录助手</h1>
							<p className="text-sm text-gray-600">管理您的基金投资组合，跟踪收益表现</p>
						</div>
						
						<div className="flex items-center gap-3">
							{/* 数据管理按钮 */}
							<Dialog open={showDataDialog} onOpenChange={setShowDataDialog}>
								<DialogTrigger asChild>
									<Button variant="outline" className="flex items-center gap-2">
										<FileText className="h-4 w-4 text-blue-500" />
										数据管理
									</Button>
								</DialogTrigger>
								<DialogContent className="max-w-md">
									<DialogHeader>
										<DialogTitle>数据管理</DialogTitle>
										<DialogDescription>
											导入导出您的基金记录数据
										</DialogDescription>
									</DialogHeader>
									<div className="py-4">
										<DataManager />
									</div>
								</DialogContent>
							</Dialog>
							
							<Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
								<DialogTrigger asChild>
									<Button className="flex items-center gap-2">
										<Plus className="h-4 w-4" />
										添加交易
									</Button>
								</DialogTrigger>
								<DialogContent className="sm:max-w-md">
									<DialogHeader>
										<DialogTitle>添加交易记录</DialogTitle>
										<DialogDescription>
											请填写基金交易的详细信息
										</DialogDescription>
									</DialogHeader>
									
									<Form {...form}>
										<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
											<div className="grid grid-cols-2 gap-4">
												<FormField
													control={form.control}
													name="fundCode"
													render={({ field }) => (
														<FormItem>
															<FormLabel>基金代码</FormLabel>
															<FormControl>
																<Input placeholder="如: 000001" {...field} />
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
												
												<FormField
													control={form.control}
													name="fundName"
													render={({ field }) => (
														<FormItem>
															<FormLabel>基金名称</FormLabel>
															<FormControl>
																<Input placeholder="如: 华夏成长混合" {...field} />
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
											</div>

											<div className="grid grid-cols-2 gap-4">
												<FormField
													control={form.control}
													name="type"
													render={({ field }) => (
														<FormItem>
															<FormLabel>交易类型</FormLabel>
															<Select onValueChange={field.onChange} defaultValue={field.value}>
																<FormControl>
																	<SelectTrigger>
																		<SelectValue placeholder="选择交易类型" />
																	</SelectTrigger>
																</FormControl>
																<SelectContent>
																	<SelectItem value="买入">买入</SelectItem>
																	<SelectItem value="卖出">卖出</SelectItem>
																</SelectContent>
															</Select>
															<FormMessage />
														</FormItem>
													)}
												/>
												
												<FormField
													control={form.control}
													name="date"
													render={({ field }) => (
														<FormItem>
															<FormLabel>交易日期</FormLabel>
															<FormControl>
																<Input type="date" {...field} />
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
											</div>

											<div className="grid grid-cols-2 gap-4">
												<FormField
													control={form.control}
													name="price"
													render={({ field }) => (
														<FormItem>
															<FormLabel>交易价格</FormLabel>
															<FormControl>
																<Input 
																	type="number" 
																	step="0.0001"
																	placeholder="0.0000"
																	{...field}
																	onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
																/>
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
												
												<FormField
													control={form.control}
													name="quantity"
													render={({ field }) => (
														<FormItem>
															<FormLabel>交易数量</FormLabel>
															<FormControl>
																<Input 
																	type="number" 
																	step="0.01"
																	placeholder="0.00"
																	{...field}
																	onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
																/>
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
											</div>

											<div className="grid grid-cols-2 gap-4">
												<FormField
													control={form.control}
													name="amount"
													render={({ field }) => (
														<FormItem>
															<FormLabel>交易金额（自动计算）</FormLabel>
															<FormControl>
																<Input 
																	type="number" 
																	step="0.01"
																	placeholder="0.00"
																	{...field}
																	value={field.value.toFixed(2)}
																	readOnly
																	className="bg-gray-50"
																/>
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
												
												<FormField
													control={form.control}
													name="unitPrice"
													render={({ field }) => (
														<FormItem>
															<FormLabel>单位现价</FormLabel>
															<FormControl>
																<Input 
																	type="number" 
																	step="0.0001"
																	placeholder="0.0000"
																	{...field}
																	onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
																/>
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
											</div>

											<div className="grid grid-cols-1 gap-4">
												<FormField
													control={form.control}
													name="fee"
													render={({ field }) => (
														<FormItem>
															<FormLabel>手续费</FormLabel>
															<FormControl>
																<Input 
																	type="number" 
																	step="0.01"
																	placeholder="0.00"
																	{...field}
																	onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
																/>
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
											</div>

											<div className="flex justify-end gap-2">
												<Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
													取消
												</Button>
												<Button type="submit">
													添加记录
												</Button>
											</div>
										</form>
									</Form>
								</DialogContent>
							</Dialog>
						</div>
					</div>
				</div>
			</div>

			{/* 主要内容区域 */}
			<div className="mx-auto max-w-7xl p-6 space-y-6">
				{/* 投资概览 - 顶部卡片 */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<PieChart className="h-5 w-5" />
							投资概览
						</CardTitle>
						<CardDescription>
							您的投资账户概览信息
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
							<Card>
								<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
									<CardTitle className="text-sm font-medium">总投入</CardTitle>
									<DollarSign className="h-4 w-4 text-muted-foreground" />
								</CardHeader>
								<CardContent>
									<div className="text-2xl font-bold">{formatCurrency(accountSummary.totalInvestment)}</div>
								</CardContent>
							</Card>
							
							<Card>
								<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
									<CardTitle className="text-sm font-medium">当前市值</CardTitle>
									<PieChart className="h-4 w-4 text-muted-foreground" />
								</CardHeader>
								<CardContent>
									<div className="text-2xl font-bold">{formatCurrency(accountSummary.totalValue)}</div>
								</CardContent>
							</Card>
							
							<Card>
								<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
									<CardTitle className="text-sm font-medium">总手续费</CardTitle>
									<DollarSign className="h-4 w-4 text-orange-600" />
								</CardHeader>
								<CardContent>
									<div className="text-2xl font-bold text-orange-600">{formatCurrency(accountSummary.totalFees)}</div>
								</CardContent>
							</Card>
							
							<Card>
								<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
									<CardTitle className="text-sm font-medium">总盈亏</CardTitle>
									{accountSummary.totalProfit >= 0 ? (
										<TrendingUp className="h-4 w-4 text-red-600" />
									) : (
										<TrendingDown className="h-4 w-4 text-green-600" />
									)}
								</CardHeader>
								<CardContent>
									<div className={`text-2xl font-bold ${accountSummary.totalProfit >= 0 ? 'text-red-600' : 'text-green-600'}`}>
										{formatCurrency(accountSummary.totalProfit)}
									</div>
								</CardContent>
							</Card>
							
							<Card>
								<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
									<CardTitle className="text-sm font-medium">总收益率</CardTitle>
									{accountSummary.totalProfitRate >= 0 ? (
										<TrendingUp className="h-4 w-4 text-red-600" />
									) : (
										<TrendingDown className="h-4 w-4 text-green-600" />
									)}
								</CardHeader>
								<CardContent>
									<div className={`text-2xl font-bold ${accountSummary.totalProfitRate >= 0 ? 'text-red-600' : 'text-green-600'}`}>
										{formatPercent(accountSummary.totalProfitRate)}
									</div>
								</CardContent>
							</Card>
						</div>
					</CardContent>
				</Card>

				{/* 主要内容区域 - 交易记录和持仓详情 */}
				<div className="space-y-6">
					{/* 当前持仓 */}
					<Card>
						<CardHeader>
							<CardTitle>当前持仓</CardTitle>
							<CardDescription>
								您当前持有的基金及其盈亏情况
							</CardDescription>
						</CardHeader>
						<CardContent>
							{holdings.length === 0 ? (
								<div className="text-center py-8 text-gray-500">
									暂无持仓记录，请先添加交易记录
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>基金代码</TableHead>
											<TableHead>基金名称</TableHead>
											<TableHead>持仓份额</TableHead>
											<TableHead>持仓成本</TableHead>
											<TableHead>当前现价</TableHead>
											<TableHead>当前市值</TableHead>
											<TableHead>盈亏金额</TableHead>
											<TableHead>收益率</TableHead>
											<TableHead>操作</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{holdings.map((holding) => (
											<TableRow key={holding.fundCode}>
												<TableCell className="font-medium">{holding.fundCode}</TableCell>
												<TableCell>{holding.fundName}</TableCell>
												<TableCell>{holding.totalShares.toFixed(2)}</TableCell>
												<TableCell>{formatCurrency(holding.totalCost)}</TableCell>
												<TableCell>
													{editingFund === holding.fundCode ? (
														<div className="flex items-center gap-2">
															<Input
																type="number"
																step="0.0001"
																value={newPrice}
																onChange={(e) => setNewPrice(e.target.value)}
																className="w-20"
															/>
															<Button 
																size="sm" 
																onClick={() => handleUpdatePrice(holding.fundCode)}
															>
																确认
															</Button>
															<Button 
																size="sm" 
																variant="outline"
																onClick={() => setEditingFund(null)}
															>
																取消
															</Button>
														</div>
													) : (
														<div className="flex items-center gap-2">
															<span>{holding.currentPrice.toFixed(4)}</span>
															<Button
																size="sm"
																variant="ghost"
																onClick={() => {
																	setEditingFund(holding.fundCode)
																	setNewPrice(holding.currentPrice.toString())
																}}
															>
																<Edit className="h-3 w-3" />
															</Button>
														</div>
													)}
												</TableCell>
												<TableCell>{formatCurrency(holding.currentValue)}</TableCell>
												<TableCell>
													<span className={holding.totalProfit >= 0 ? 'text-red-600' : 'text-green-600'}>
														{formatCurrency(holding.totalProfit)}
													</span>
												</TableCell>
												<TableCell>
													<Badge variant={holding.profitRate >= 0 ? 'default' : 'destructive'} className={holding.profitRate >= 0 ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}>
														{formatPercent(holding.profitRate)}
													</Badge>
												</TableCell>
												<TableCell>
													<Button
														size="sm"
														variant="ghost"
														onClick={() => {
															setEditingFund(holding.fundCode)
															setNewPrice(holding.currentPrice.toString())
														}}
													>
														更新现价
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>

					{/* 交易记录 */}
					<Card>
						<CardHeader>
							<CardTitle>交易记录</CardTitle>
							<CardDescription>
								所有基金买入和卖出的历史记录，按基金分类显示
							</CardDescription>
						</CardHeader>
						<CardContent>
							{transactions.length === 0 ? (
								<div className="text-center py-8 text-gray-500">
									暂无交易记录，请先添加交易记录
								</div>
							) : (
								<div className="space-y-4">
									{/* 按基金分组显示交易记录 */}
									{(() => {
										// 按基金代码分组
										const groupedTransactions = transactions.reduce((groups, transaction) => {
											const key = `${transaction.fundCode}-${transaction.fundName}`
											if (!groups[key]) {
												groups[key] = []
											}
											groups[key].push(transaction)
											return groups
										}, {} as Record<string, Transaction[]>)

										const fundGroups = Object.entries(groupedTransactions)

										if (fundGroups.length === 1) {
											// 只有一只基金时，直接显示表格
											const fundGroup = fundGroups[0]
											if (!fundGroup) return null
											
											const [fundKey, fundTransactions] = fundGroup
											const [fundCode, fundName] = fundKey.split('-')
											
											return (
												<div>
													<div className="mb-4 p-3 bg-blue-50 rounded-lg">
														<h3 className="font-medium text-blue-800">
															{fundCode} - {fundName}
														</h3>
														<p className="text-sm text-blue-600">
															共 {fundTransactions.length} 条交易记录
														</p>
													</div>
													<Table>
														<TableHeader>
															<TableRow>
																<TableHead>日期</TableHead>
																<TableHead>交易类型</TableHead>
																<TableHead>交易价格</TableHead>
																<TableHead>交易数量</TableHead>
																<TableHead>交易金额</TableHead>
																<TableHead>单位现价</TableHead>
																<TableHead>手续费</TableHead>
																<TableHead>操作</TableHead>
															</TableRow>
														</TableHeader>
														<TableBody>
															{fundTransactions
																.sort((a: Transaction, b: Transaction) => new Date(b.date).getTime() - new Date(a.date).getTime())
																.map((transaction: Transaction) => (
																<TableRow key={transaction.id}>
																	<TableCell>{transaction.date}</TableCell>
																	<TableCell>
																		<Badge variant={transaction.type === '买入' ? 'default' : 'secondary'}>
																			{transaction.type}
																		</Badge>
																	</TableCell>
																	<TableCell>{transaction.price.toFixed(4)}</TableCell>
																	<TableCell>{transaction.quantity.toFixed(2)}</TableCell>
																	<TableCell>{transaction.amount.toFixed(2)}</TableCell>
																	<TableCell>{transaction.unitPrice.toFixed(4)}</TableCell>
																	<TableCell>
																		{editingFeeId === transaction.id ? (
																			<div className="flex items-center gap-1">
																				<Input
																					type="number"
																					step="0.01"
																					value={editingFeeValue}
																					onChange={(e) => setEditingFeeValue(e.target.value)}
																					className="w-16 h-6 text-xs"
																					onKeyDown={(e) => {
																						if (e.key === 'Enter') {
																							handleUpdateFee(transaction.id, editingFeeValue)
																						} else if (e.key === 'Escape') {
																							setEditingFeeId(null)
																							setEditingFeeValue('')
																						}
																					}}
																					autoFocus
																				/>
																				<Button
																					size="sm"
																					variant="ghost"
																					className="h-6 w-6 p-0"
																					onClick={() => handleUpdateFee(transaction.id, editingFeeValue)}
																				>
																					✓
																				</Button>
																			</div>
																		) : (
																			<div 
																				className="cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded"
																				onClick={() => {
																					setEditingFeeId(transaction.id)
																					setEditingFeeValue(transaction.fee.toString())
																				}}
																			>
																				{transaction.fee.toFixed(2)}
																			</div>
																		)}
																	</TableCell>
																	<TableCell>
																		<Button
																			size="sm"
																			variant="ghost"
																			onClick={() => handleDeleteTransaction(transaction.id)}
																		>
																			<Trash2 className="h-3 w-3" />
																		</Button>
																	</TableCell>
																</TableRow>
															))}
														</TableBody>
													</Table>
												</div>
											)
										} else {
											// 多只基金时，使用Tabs分组显示
											const defaultValue = fundGroups[0]?.[0] || ''
											
											return (
												<Tabs defaultValue={defaultValue} className="w-full">
													<TabsList className="grid w-full grid-cols-auto gap-1 h-auto p-1" style={{gridTemplateColumns: `repeat(${Math.min(fundGroups.length, 4)}, 1fr)`}}>
														{fundGroups.slice(0, 4).map(([fundKey]) => {
															const [fundCode, fundName] = fundKey.split('-')
															return (
																<TabsTrigger 
																	key={fundKey} 
																	value={fundKey}
																	className="text-xs px-2 py-1 data-[state=active]:bg-blue-100"
																>
																	{fundCode}
																</TabsTrigger>
															)
														})}
														{fundGroups.length > 4 && (
															<div className="text-xs text-gray-500 px-2 py-1">
																+{fundGroups.length - 4}只
															</div>
														)}
													</TabsList>
													
													{fundGroups.map(([fundKey, fundTransactions]) => {
														const [fundCode, fundName] = fundKey.split('-')
														
														return (
															<TabsContent key={fundKey} value={fundKey} className="mt-4">
																<div className="mb-4 p-3 bg-blue-50 rounded-lg">
																	<h3 className="font-medium text-blue-800">
																		{fundCode} - {fundName}
																	</h3>
																	<p className="text-sm text-blue-600">
																		共 {fundTransactions.length} 条交易记录
																	</p>
																</div>
																<Table>
																	<TableHeader>
																		<TableRow>
																			<TableHead>日期</TableHead>
																			<TableHead>交易类型</TableHead>
																			<TableHead>交易价格</TableHead>
																			<TableHead>交易数量</TableHead>
																			<TableHead>交易金额</TableHead>
																			<TableHead>单位现价</TableHead>
																			<TableHead>手续费</TableHead>
																			<TableHead>操作</TableHead>
																		</TableRow>
																	</TableHeader>
																	<TableBody>
																		{fundTransactions
																			.sort((a: Transaction, b: Transaction) => new Date(b.date).getTime() - new Date(a.date).getTime())
																			.map((transaction: Transaction) => (
																			<TableRow key={transaction.id}>
																				<TableCell>{transaction.date}</TableCell>
																				<TableCell>
																					<Badge variant={transaction.type === '买入' ? 'default' : 'secondary'}>
																						{transaction.type}
																					</Badge>
																				</TableCell>
																				<TableCell>{transaction.price.toFixed(4)}</TableCell>
																				<TableCell>{transaction.quantity.toFixed(2)}</TableCell>
																				<TableCell>{transaction.amount.toFixed(2)}</TableCell>
																				<TableCell>{transaction.unitPrice.toFixed(4)}</TableCell>
																				<TableCell>
																					{editingFeeId === transaction.id ? (
																						<div className="flex items-center gap-1">
																							<Input
																								type="number"
																								step="0.01"
																								value={editingFeeValue}
																								onChange={(e) => setEditingFeeValue(e.target.value)}
																								className="w-16 h-6 text-xs"
																								onKeyDown={(e) => {
																									if (e.key === 'Enter') {
																										handleUpdateFee(transaction.id, editingFeeValue)
																									} else if (e.key === 'Escape') {
																										setEditingFeeId(null)
																										setEditingFeeValue('')
																									}
																								}}
																								autoFocus
																							/>
																							<Button
																								size="sm"
																								variant="ghost"
																								className="h-6 w-6 p-0"
																								onClick={() => handleUpdateFee(transaction.id, editingFeeValue)}
																							>
																								✓
																							</Button>
																						</div>
																					) : (
																						<div 
																							className="cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded"
																							onClick={() => {
																								setEditingFeeId(transaction.id)
																								setEditingFeeValue(transaction.fee.toString())
																							}}
																						>
																								{transaction.fee.toFixed(2)}
																						</div>
																					)}
																				</TableCell>
																				<TableCell>
																					<Button
																						size="sm"
																						variant="ghost"
																						onClick={() => handleDeleteTransaction(transaction.id)}
																					>
																						<Trash2 className="h-3 w-3" />
																					</Button>
																				</TableCell>
																			</TableRow>
																		))}
																	</TableBody>
																</Table>
															</TabsContent>
														)
													})}
												</Tabs>
											)
										}
									})()}
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}
