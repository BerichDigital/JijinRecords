interface CloudSyncConfig {
  apiKey: string
  binId?: string
}

interface FundData {
  transactions: any[]
  holdings: any[]
  accountSummary: any
  fundPrices: Record<string, number>
}

class CloudSync {
  private config: CloudSyncConfig | null = null
  private baseUrl = 'https://api.jsonbin.io/v3'

  constructor() {
    // 只在客户端加载配置
    if (typeof window !== 'undefined') {
      this.loadConfig()
    }
  }

  // 设置云端同步配置
  setConfig(config: CloudSyncConfig) {
    this.config = config
    if (typeof window !== 'undefined') {
      localStorage.setItem('cloud-sync-config', JSON.stringify(config))
    }
  }

  // 从 localStorage 加载配置
  private loadConfig() {
    if (typeof window === 'undefined') return
    
    try {
      const saved = localStorage.getItem('cloud-sync-config')
      if (saved) {
        this.config = JSON.parse(saved)
      }
    } catch (error) {
      console.error('加载配置失败:', error)
    }
  }

  // 检查是否已配置
  isConfigured(): boolean {
    return !!(this.config?.apiKey)
  }

  // 生成基于API密钥的固定binId
  private generateBinId(apiKey: string): string {
    // 使用API密钥的一部分生成一致的binId
    // 这确保所有使用相同API密钥的设备都会使用同一个binId
    const hash = this.simpleHash(apiKey + 'jijin-records-v2')
    const binId = hash.substring(0, 24) // JSONBin.io的binId长度通常是24位
    console.log('生成的固定binId:', binId, '基于API密钥:', apiKey.substring(0, 10) + '...')
    return binId
  }

  // 简单的哈希函数
  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    const result = Math.abs(hash).toString(16).padStart(24, '0')
    console.log('哈希计算:', str.substring(0, 20) + '... -> ', result)
    return result
  }

  // 查找现有的bin
  private async findExistingBin(): Promise<string | null> {
    if (!this.config?.apiKey) return null

    try {
      console.log('开始查找现有bin...')
      
      // 获取所有bins
      const response = await fetch(`${this.baseUrl}/c/collections`, {
        headers: {
          'X-Master-Key': this.config.apiKey
        }
      })

      if (response.ok) {
        const result = await response.json()
        console.log('获取到的bins列表:', result)
        
        const bins = result.record || []
        const apiKeyHash = this.simpleHash(this.config.apiKey).substring(0, 8)
        
        // 查找匹配的bin
        for (const bin of bins) {
          console.log('检查bin:', bin)
          
          // 检查bin名称是否匹配
          if (bin.name && (
            bin.name.includes('jijin-records') || 
            bin.name.includes(apiKeyHash)
          )) {
            console.log('找到可能匹配的bin:', bin.id, bin.name)
            
            // 验证bin内容
            try {
              const binResponse = await fetch(`${this.baseUrl}/b/${bin.id}/latest`, {
                headers: {
                  'X-Master-Key': this.config.apiKey
                }
              })
              
              if (binResponse.ok) {
                const binData = await binResponse.json()
                const record = binData.record
                
                console.log('bin内容验证:', record)
                
                // 检查是否是我们的数据格式
                if (record && (
                  record._metadata?.appName === "基金投资记录助手" ||
                  record._metadata?.apiKeyHash === apiKeyHash ||
                  (record.transactions !== undefined && record.holdings !== undefined)
                )) {
                  console.log('找到匹配的数据bin:', bin.id)
                  return bin.id
                }
              }
            } catch (error) {
              console.log('验证bin失败:', bin.id, error)
            }
          }
        }
      }
      
      console.log('没有找到现有的匹配bin')
      return null
    } catch (error) {
      console.error('查找现有bin失败:', error)
      return null
    }
  }

  // 确保bin存在，如果不存在则创建
  private async ensureBinExists(): Promise<boolean> {
    if (!this.config?.apiKey) {
      console.log('没有API密钥，无法确保bin存在')
      return false
    }

    console.log('开始确保bin存在，当前配置:', {
      hasApiKey: !!this.config.apiKey,
      currentBinId: this.config.binId
    })

    // 如果已经有binId，先验证是否有效
    if (this.config.binId) {
      try {
        console.log('验证现有binId:', this.config.binId)
        const checkResponse = await fetch(`${this.baseUrl}/b/${this.config.binId}`, {
          method: 'HEAD',
          headers: {
            'X-Master-Key': this.config.apiKey
          }
        })

        console.log('现有bin验证结果:', checkResponse.status, checkResponse.statusText)

        if (checkResponse.ok) {
          console.log('现有bin有效，继续使用')
          return true
        }
        
        console.log('现有bin无效，清除并重新查找')
        // 如果bin不存在，清除无效的binId
        this.config.binId = undefined
        this.setConfig(this.config)
      } catch (error) {
        console.error('验证现有bin失败:', error)
        this.config.binId = undefined
        this.setConfig(this.config)
      }
    }

    // 尝试查找现有的bin
    console.log('尝试查找现有bin...')
    const existingBinId = await this.findExistingBin()
    if (existingBinId) {
      console.log('找到现有bin，使用:', existingBinId)
      this.config.binId = existingBinId
      this.setConfig(this.config)
      return true
    }

    // 如果没有找到现有bin，创建新的
    console.log('没有找到现有bin，创建新的...')
    try {
      const apiKeyHash = this.simpleHash(this.config.apiKey).substring(0, 8)
      const createResponse = await fetch(`${this.baseUrl}/b`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': this.config.apiKey,
          'X-Bin-Name': `jijin-records-${apiKeyHash}-${Date.now()}`
        },
        body: JSON.stringify({
          _metadata: {
            appName: "基金投资记录助手",
            version: "1.0.0",
            created: new Date().toISOString(),
            apiKeyHash: apiKeyHash,
            deviceInfo: {
              userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown',
              timestamp: Date.now()
            }
          },
          transactions: [],
          holdings: [],
          accountSummary: {
            totalInvestment: 0,
            totalValue: 0,
            totalProfit: 0,
            totalProfitRate: 0
          },
          fundPrices: {}
        })
      })

      console.log('创建bin响应:', createResponse.status, createResponse.statusText)

      if (createResponse.ok) {
        const result = await createResponse.json()
        console.log('创建bin成功，结果:', result)
        
        const actualBinId = result.metadata?.id
        if (actualBinId) {
          console.log('保存新的binId:', actualBinId)
          this.config.binId = actualBinId
          this.setConfig(this.config)
          return true
        }
      } else {
        const errorText = await createResponse.text()
        console.error('创建bin失败，错误详情:', errorText)
      }

      return false
    } catch (error) {
      console.error('创建bin异常:', error)
      return false
    }
  }

  // 上传数据到云端
  async uploadData(data: FundData): Promise<boolean> {
    if (!this.config?.apiKey) {
      throw new Error('请先设置 API 密钥')
    }

    try {
      // 确保bin存在
      const binExists = await this.ensureBinExists()
      if (!binExists || !this.config.binId) {
        throw new Error('无法创建或访问数据存储')
      }

      const uploadData = {
        _metadata: {
          appName: "基金投资记录助手",
          version: "1.0.0",
          lastUpdated: new Date().toISOString(),
          deviceInfo: {
            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown',
            timestamp: Date.now()
          }
        },
        ...data
      }

      const response = await fetch(`${this.baseUrl}/b/${this.config.binId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': this.config.apiKey
        },
        body: JSON.stringify(uploadData)
      })

      return response.ok
    } catch (error) {
      console.error('上传数据失败:', error)
      return false
    }
  }

  // 从云端下载数据
  async downloadData(): Promise<FundData | null> {
    if (!this.config?.apiKey) {
      console.error('下载失败：没有API密钥')
      throw new Error('请先设置 API 密钥')
    }

    try {
      console.log('=== 开始下载数据流程 ===')
      console.log('当前配置:', {
        hasApiKey: !!this.config.apiKey,
        apiKeyPrefix: this.config.apiKey.substring(0, 10) + '...',
        binId: this.config.binId
      })

      // 确保bin存在
      console.log('步骤1: 确保bin存在...')
      const binExists = await this.ensureBinExists()
      console.log('bin存在检查结果:', binExists, '最终binId:', this.config.binId)
      
      if (!binExists || !this.config.binId) {
        console.log('bin不存在或无效，返回空数据结构')
        // 如果bin不存在，返回空数据
        const emptyData = {
          transactions: [],
          holdings: [],
          accountSummary: {
            totalInvestment: 0,
            totalValue: 0,
            totalProfit: 0,
            totalProfitRate: 0
          },
          fundPrices: {}
        }
        console.log('返回空数据:', emptyData)
        return emptyData
      }

      console.log('步骤2: 从云端下载数据...')
      console.log('请求URL:', `${this.baseUrl}/b/${this.config.binId}/latest`)
      
      const response = await fetch(`${this.baseUrl}/b/${this.config.binId}/latest`, {
        headers: {
          'X-Master-Key': this.config.apiKey
        }
      })

      console.log('下载响应状态:', response.status, response.statusText)
      console.log('响应头:', Object.fromEntries(response.headers.entries()))

      if (response.ok) {
        const result = await response.json()
        console.log('步骤3: 解析响应数据...')
        console.log('完整响应结构:', result)
        
        const data = result.record
        console.log('提取的record数据:', data)
        
        if (!data) {
          console.error('响应中没有record数据')
          return null
        }
        
        // 验证数据结构
        console.log('步骤4: 验证数据结构...')
        console.log('数据类型检查:', {
          hasTransactions: Array.isArray(data.transactions),
          transactionsLength: data.transactions?.length || 0,
          hasHoldings: Array.isArray(data.holdings),
          holdingsLength: data.holdings?.length || 0,
          hasAccountSummary: !!data.accountSummary,
          hasFundPrices: !!data.fundPrices,
          hasMetadata: !!data._metadata
        })
        
        // 移除元数据，只返回基金数据
        const { _metadata, ...fundData } = data
        
        // 确保数据结构完整
        const completeData = {
          transactions: fundData.transactions || [],
          holdings: fundData.holdings || [],
          accountSummary: fundData.accountSummary || {
            totalInvestment: 0,
            totalValue: 0,
            totalProfit: 0,
            totalProfitRate: 0
          },
          fundPrices: fundData.fundPrices || {}
        }
        
        console.log('步骤5: 最终返回的数据:', completeData)
        console.log('数据统计:', {
          transactionsCount: completeData.transactions.length,
          holdingsCount: completeData.holdings.length,
          totalInvestment: completeData.accountSummary.totalInvestment,
          fundPricesCount: Object.keys(completeData.fundPrices).length
        })
        
        if (completeData.transactions.length === 0 && completeData.holdings.length === 0) {
          console.warn('警告：下载的数据为空，可能云端还没有数据')
        }
        
        console.log('=== 下载数据流程完成 ===')
        return completeData
      } else {
        console.error('下载失败，HTTP状态:', response.status)
        const errorText = await response.text()
        console.error('错误响应内容:', errorText)
        
        // 尝试解析错误信息
        try {
          const errorJson = JSON.parse(errorText)
          console.error('解析的错误信息:', errorJson)
        } catch (e) {
          console.error('无法解析错误响应为JSON')
        }
      }
      
      return null
    } catch (error) {
      console.error('=== 下载数据异常 ===')
      console.error('异常类型:', error instanceof Error ? error.constructor.name : typeof error)
      console.error('异常消息:', error instanceof Error ? error.message : String(error))
      if (error instanceof Error && error.stack) {
        console.error('异常堆栈:', error.stack)
      }
      return null
    }
  }

  // 检查云端是否有数据
  async hasCloudData(): Promise<boolean> {
    if (!this.config?.apiKey) {
      return false
    }

    try {
      const binExists = await this.ensureBinExists()
      return binExists
    } catch (error) {
      return false
    }
  }

  // 获取云端数据信息
  async getCloudDataInfo(): Promise<any> {
    if (!this.config?.apiKey) {
      return null
    }

    try {
      const binExists = await this.ensureBinExists()
      if (!binExists || !this.config.binId) {
        return null
      }

      const response = await fetch(`${this.baseUrl}/b/${this.config.binId}`, {
        headers: {
          'X-Master-Key': this.config.apiKey
        }
      })

      if (response.ok) {
        const result = await response.json()
        const metadata = result.record?._metadata
        return {
          lastUpdated: metadata?.lastUpdated || result.metadata?.createdAt,
          size: JSON.stringify(result.record).length,
          binId: this.config.binId,
          deviceInfo: metadata?.deviceInfo,
          appVersion: metadata?.version
        }
      }
      
      return null
    } catch (error) {
      console.error('获取云端数据信息失败:', error)
      return null
    }
  }

  // 清除配置
  clearConfig() {
    this.config = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cloud-sync-config')
    }
  }

  // 获取当前配置状态
  getConfigStatus() {
    return {
      hasApiKey: !!(this.config?.apiKey),
      hasBinId: !!(this.config?.binId),
      isConfigured: this.isConfigured()
    }
  }
}

export const cloudSync = new CloudSync()
export type { FundData, CloudSyncConfig } 