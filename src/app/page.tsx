'use client'

import { useState } from 'react'
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
import { Plus, TrendingUp, TrendingDown, DollarSign, PieChart, Trash2, Edit, Database } from 'lucide-react'
import type { Transaction } from '@/store/fund'

interface TransactionFormData {
	fundCode: string
	fundName: string
	type: '买入' | '卖出'
	date: string
	amount: number
	shares: number
	unitPrice: number
	fee: number
}

export default function FundRecordsPage() {
	const { 
		transactions, 
		holdings, 
		accountSummary, 
		addTransaction, 
		deleteTransaction,
		updateFundPrice 
	} = useFundStore()
	
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
	const [editingFund, setEditingFund] = useState<string | null>(null)
	const [newPrice, setNewPrice] = useState('')

	const form = useForm<TransactionFormData>({
		defaultValues: {
			fundCode: '',
			fundName: '',
			type: '买入',
			date: new Date().toISOString().split('T')[0],
			amount: 0,
			shares: 0,
			unitPrice: 0,
			fee: 0
		}
	})

	// 初始化示例数据
	const initSampleData = () => {
		const sampleTransactions = [
			{
				fundCode: '000001',
				fundName: '华夏成长混合',
				type: '买入' as const,
				date: '2024-01-15',
				amount: 10000,
				shares: 8547.01,
				unitPrice: 1.1700,
				fee: 15
			},
			{
				fundCode: '110022',
				fundName: '易方达消费行业股票',
				type: '买入' as const,
				date: '2024-02-20',
				amount: 5000,
				shares: 1666.67,
				unitPrice: 3.0000,
				fee: 7.5
			},
			{
				fundCode: '000001',
				fundName: '华夏成长混合',
				type: '买入' as const,
				date: '2024-03-10',
				amount: 5000,
				shares: 4166.67,
				unitPrice: 1.2000,
				fee: 7.5
			},
			{
				fundCode: '161725',
				fundName: '招商中证白酒指数',
				type: '买入' as const,
				date: '2024-04-05',
				amount: 8000,
				shares: 8000.00,
				unitPrice: 1.0000,
				fee: 12
			}
		]

		sampleTransactions.forEach(transaction => {
			addTransaction(transaction)
		})

		// 模拟价格变化
		setTimeout(() => {
			updateFundPrice('000001', 1.2500) // 上涨
			updateFundPrice('110022', 2.8500) // 下跌
			updateFundPrice('161725', 1.0800) // 上涨
		}, 500)

		toast.success('示例数据初始化完成！')
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
		<div className="min-h-screen bg-gray-50 p-4">
			<div className="mx-auto max-w-7xl space-y-6">
				{/* 页面标题 */}
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">基金投资记录助手</h1>
						<p className="text-gray-600">管理您的基金投资组合，跟踪收益表现</p>
					</div>
					
					<div className="flex items-center gap-2">
						{transactions.length === 0 && (
							<Button 
								variant="outline" 
								onClick={initSampleData}
								className="flex items-center gap-2"
							>
								<Database className="h-4 w-4" />
								加载示例数据
							</Button>
						)}
						
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
															<Input placeholder="基金名称" {...field} />
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
																	<SelectValue />
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
												name="amount"
												render={({ field }) => (
													<FormItem>
														<FormLabel>交易金额</FormLabel>
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
											
											<FormField
												control={form.control}
												name="shares"
												render={({ field }) => (
													<FormItem>
														<FormLabel>成交份额</FormLabel>
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
												name="unitPrice"
												render={({ field }) => (
													<FormItem>
														<FormLabel>单位净值</FormLabel>
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
											<Button type="submit">添加记录</Button>
										</div>
									</form>
								</Form>
							</DialogContent>
						</Dialog>
					</div>
				</div>

				{/* 账户总览 */}
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
							<CardTitle className="text-sm font-medium">总盈亏</CardTitle>
							{accountSummary.totalProfit >= 0 ? (
								<TrendingUp className="h-4 w-4 text-green-600" />
							) : (
								<TrendingDown className="h-4 w-4 text-red-600" />
							)}
						</CardHeader>
						<CardContent>
							<div className={`text-2xl font-bold ${accountSummary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
								{formatCurrency(accountSummary.totalProfit)}
							</div>
						</CardContent>
					</Card>
					
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">总收益率</CardTitle>
							{accountSummary.totalProfitRate >= 0 ? (
								<TrendingUp className="h-4 w-4 text-green-600" />
							) : (
								<TrendingDown className="h-4 w-4 text-red-600" />
							)}
						</CardHeader>
						<CardContent>
							<div className={`text-2xl font-bold ${accountSummary.totalProfitRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
								{formatPercent(accountSummary.totalProfitRate)}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* 使用指南 - 仅在无数据时显示 */}
				{transactions.length === 0 && (
					<Card className="border-dashed">
						<CardHeader>
							<CardTitle className="text-center">🎯 开始使用基金投资记录助手</CardTitle>
							<CardDescription className="text-center">
								选择以下方式之一开始管理您的基金投资组合
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-4">
									<h3 className="font-semibold text-lg flex items-center gap-2">
										<Database className="h-5 w-5 text-blue-600" />
										体验演示
									</h3>
									<p className="text-gray-600">
										点击"加载示例数据"按钮，系统将自动添加一些示例基金交易记录，让您快速了解系统的功能和界面。
									</p>
									<ul className="text-sm text-gray-500 space-y-1">
										<li>• 包含3只不同类型的基金</li>
										<li>• 模拟真实的买入交易</li>
										<li>• 展示盈亏计算效果</li>
									</ul>
								</div>
								
								<div className="space-y-4">
									<h3 className="font-semibold text-lg flex items-center gap-2">
										<Plus className="h-5 w-5 text-green-600" />
										手动添加
									</h3>
									<p className="text-gray-600">
										点击"添加交易"按钮，手动输入您的真实基金交易记录，开始管理您的投资组合。
									</p>
									<ul className="text-sm text-gray-500 space-y-1">
										<li>• 记录买入/卖出交易</li>
										<li>• 跟踪投资成本和收益</li>
										<li>• 实时更新基金净值</li>
									</ul>
								</div>
							</div>
							
							<div className="mt-6 p-4 bg-blue-50 rounded-lg">
								<h4 className="font-medium text-blue-900 mb-2">💡 使用提示</h4>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
									<div>
										<strong>数据安全：</strong>所有数据保存在您的浏览器本地，不会上传到服务器
									</div>
									<div>
										<strong>净值更新：</strong>可以随时手动更新基金净值以获得准确的盈亏计算
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				)}

				{/* 主要内容区域 */}
				<Tabs defaultValue="holdings" className="space-y-4">
					<TabsList>
						<TabsTrigger value="holdings">持仓明细</TabsTrigger>
						<TabsTrigger value="transactions">交易记录</TabsTrigger>
					</TabsList>
					
					<TabsContent value="holdings" className="space-y-4">
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
												<TableHead>当前净值</TableHead>
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
														<span className={holding.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
															{formatCurrency(holding.totalProfit)}
														</span>
													</TableCell>
													<TableCell>
														<Badge variant={holding.profitRate >= 0 ? 'default' : 'destructive'}>
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
															更新净值
														</Button>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								)}
							</CardContent>
						</Card>
					</TabsContent>
					
					<TabsContent value="transactions" className="space-y-4">
						<Card>
							<CardHeader>
								<CardTitle>交易记录</CardTitle>
								<CardDescription>
									所有基金买入和卖出的历史记录
								</CardDescription>
							</CardHeader>
							<CardContent>
								{transactions.length === 0 ? (
									<div className="text-center py-8 text-gray-500">
										暂无交易记录，请先添加交易记录
									</div>
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>日期</TableHead>
												<TableHead>基金代码</TableHead>
												<TableHead>基金名称</TableHead>
												<TableHead>交易类型</TableHead>
												<TableHead>交易金额</TableHead>
												<TableHead>成交份额</TableHead>
												<TableHead>单位净值</TableHead>
												<TableHead>手续费</TableHead>
												<TableHead>操作</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{transactions
												.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
												.map((transaction) => (
												<TableRow key={transaction.id}>
													<TableCell>{transaction.date}</TableCell>
													<TableCell className="font-medium">{transaction.fundCode}</TableCell>
													<TableCell>{transaction.fundName}</TableCell>
													<TableCell>
														<Badge variant={transaction.type === '买入' ? 'default' : 'secondary'}>
															{transaction.type}
														</Badge>
													</TableCell>
													<TableCell>{formatCurrency(transaction.amount)}</TableCell>
													<TableCell>{transaction.shares.toFixed(2)}</TableCell>
													<TableCell>{transaction.unitPrice.toFixed(4)}</TableCell>
													<TableCell>{formatCurrency(transaction.fee)}</TableCell>
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
								)}
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	)
}
