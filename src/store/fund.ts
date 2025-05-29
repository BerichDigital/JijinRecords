import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 交易记录接口
export interface Transaction {
  id: string
  fundCode: string
  fundName: string
  type: '买入' | '卖出'
  date: string
  price: number // 交易价格
  quantity: number // 交易数量（原来的shares）
  amount: number // 交易金额（计算得出：price × quantity）
  unitPrice: number // 单位现价（保留用于显示）
  fee: number // 手续费
}

// 基金持仓信息
export interface FundHolding {
  fundCode: string
  fundName: string
  totalShares: number // 总持仓份额
  totalCost: number // 总成本（包含手续费）
  averageCost: number // 平均成本
  currentPrice: number // 当前净值
  currentValue: number // 当前市值
  totalProfit: number // 累计盈亏
  profitRate: number // 收益率
}

// 账户总览
export interface AccountSummary {
  totalInvestment: number // 总投入
  totalValue: number // 当前总市值
  totalFees: number // 总手续费
  totalProfit: number // 总盈亏
  totalProfitRate: number // 总收益率
}

interface FundState {
  transactions: Transaction[]
  holdings: FundHolding[]
  accountSummary: AccountSummary
  fundPrices: Record<string, number> // 存储手动更新的基金价格
  
  // 操作方法
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void
  updateFundPrice: (fundCode: string, currentPrice: number) => void
  updateTransactionFee: (transactionId: string, newFee: number) => void
  deleteTransaction: (id: string) => void
  calculateHoldings: () => void
  getTransactionsByFund: (fundCode: string) => Transaction[]
  
  // 新增：数据同步方法
  importData: (data: {
    transactions: Transaction[]
    holdings: FundHolding[]
    accountSummary: AccountSummary
    fundPrices: Record<string, number>
  }) => void
  exportData: () => {
    transactions: Transaction[]
    holdings: FundHolding[]
    accountSummary: AccountSummary
    fundPrices: Record<string, number>
  }
}

export const useFundStore = create<FundState>()(
  persist(
    (set, get) => ({
      transactions: [],
      holdings: [],
      accountSummary: {
        totalInvestment: 0,
        totalValue: 0,
        totalFees: 0,
        totalProfit: 0,
        totalProfitRate: 0
      },
      fundPrices: {},

      addTransaction: (transaction) => {
        const newTransaction: Transaction = {
          ...transaction,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
        }
        
        set(state => ({
          transactions: [...state.transactions, newTransaction]
        }))
        
        // 重新计算持仓
        get().calculateHoldings()
      },

      updateFundPrice: (fundCode, currentPrice) => {
        // 先更新价格存储
        set(state => ({
          ...state,
          fundPrices: {
            ...state.fundPrices,
            [fundCode]: currentPrice
          }
        }))
        
        // 重新计算持仓（会使用新的价格）
        get().calculateHoldings()
      },

      updateTransactionFee: (transactionId, newFee) => {
        set(state => ({
          transactions: state.transactions.map(t => 
            t.id === transactionId ? { ...t, fee: newFee } : t
          )
        }))
        
        // 重新计算持仓
        get().calculateHoldings()
      },

      deleteTransaction: (id) => {
        set(state => ({
          transactions: state.transactions.filter(t => t.id !== id)
        }))
        
        // 重新计算持仓
        get().calculateHoldings()
      },

      calculateHoldings: () => {
        const { transactions, fundPrices } = get()
        const fundMap = new Map<string, {
          fundName: string
          totalShares: number
          totalCost: number
          currentPrice: number
        }>()

        // 按基金代码分组计算
        transactions.forEach(transaction => {
          const existing = fundMap.get(transaction.fundCode) || {
            fundName: transaction.fundName,
            totalShares: 0,
            totalCost: 0,
            currentPrice: transaction.unitPrice
          }

          if (transaction.type === '买入') {
            existing.totalShares += transaction.quantity
            existing.totalCost += transaction.amount + transaction.fee
          } else if (transaction.type === '卖出') {
            // 按比例减少成本
            const sellRatio = transaction.quantity / existing.totalShares
            existing.totalCost -= existing.totalCost * sellRatio
            existing.totalShares -= transaction.quantity
          }

          // 使用手动更新的价格，如果没有则使用最新交易价格
          const manualPrice = fundPrices[transaction.fundCode]
          if (manualPrice !== undefined) {
            existing.currentPrice = manualPrice
          } else {
            // 使用最新的交易价格作为默认价格
            existing.currentPrice = transaction.unitPrice
          }

          fundMap.set(transaction.fundCode, existing)
        })

        // 转换为持仓数组
        const holdings: FundHolding[] = Array.from(fundMap.entries())
          .filter(([_, data]) => data.totalShares > 0.01) // 过滤掉已清仓的基金
          .map(([fundCode, data]) => ({
            fundCode,
            fundName: data.fundName,
            totalShares: data.totalShares,
            totalCost: data.totalCost,
            averageCost: data.totalCost / data.totalShares,
            currentPrice: data.currentPrice,
            currentValue: data.totalShares * data.currentPrice,
            totalProfit: (data.totalShares * data.currentPrice) - data.totalCost,
            profitRate: data.totalCost > 0 ? ((data.totalShares * data.currentPrice) - data.totalCost) / data.totalCost * 100 : 0
          }))

        // 计算账户总览
        const totalInvestment = holdings.reduce((sum, h) => sum + h.totalCost, 0)
        const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0)
        
        // 计算总手续费：所有交易手续费的总和
        const totalFees = transactions.reduce((sum, t) => sum + t.fee, 0)
        
        // 总盈亏 = 当前市值 - 总投入 - 总手续费
        const totalProfit = totalValue - totalInvestment - totalFees
        
        // 总收益率 = 总盈亏 ÷ (当前市值 - 总盈亏)
        const denominator = totalValue - totalProfit
        const totalProfitRate = denominator > 0 ? (totalProfit / denominator) * 100 : 0

        set({
          holdings,
          accountSummary: {
            totalInvestment,
            totalValue,
            totalFees,
            totalProfit,
            totalProfitRate
          }
        })
      },

      getTransactionsByFund: (fundCode) => {
        return get().transactions.filter(t => t.fundCode === fundCode)
      },

      // 新增：导入数据方法
      importData: (data) => {
        set({
          transactions: data.transactions || [],
          holdings: data.holdings || [],
          accountSummary: data.accountSummary || {
            totalInvestment: 0,
            totalValue: 0,
            totalFees: 0,
            totalProfit: 0,
            totalProfitRate: 0
          },
          fundPrices: data.fundPrices || {}
        })
        
        // 重新计算持仓以确保数据一致性
        get().calculateHoldings()
      },

      // 新增：导出数据方法
      exportData: () => {
        const state = get()
        return {
          transactions: state.transactions,
          holdings: state.holdings,
          accountSummary: state.accountSummary,
          fundPrices: state.fundPrices
        }
      }
    }),
    {
      name: 'fund-storage',
      // 移除 skipHydration，让数据正常加载
      partialize: (state) => ({
        transactions: state.transactions,
        holdings: state.holdings,
        accountSummary: state.accountSummary,
        fundPrices: state.fundPrices
      })
    }
  )
) 