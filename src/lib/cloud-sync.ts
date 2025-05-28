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
    const hash = this.simpleHash(apiKey + 'jijin-records')
    return hash.substring(0, 24) // JSONBin.io的binId长度通常是24位
  }

  // 简单的哈希函数
  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return Math.abs(hash).toString(16).padStart(24, '0')
  }

  // 确保bin存在，如果不存在则创建
  private async ensureBinExists(): Promise<boolean> {
    if (!this.config?.apiKey) {
      return false
    }

    // 生成固定的binId
    const binId = this.generateBinId(this.config.apiKey)
    
    try {
      // 首先检查bin是否存在
      const checkResponse = await fetch(`${this.baseUrl}/b/${binId}`, {
        method: 'HEAD',
        headers: {
          'X-Master-Key': this.config.apiKey
        }
      })

      if (checkResponse.ok) {
        // bin存在，保存binId
        this.config.binId = binId
        this.setConfig(this.config)
        return true
      }

      // bin不存在，创建新的bin
      const createResponse = await fetch(`${this.baseUrl}/b`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': this.config.apiKey,
          'X-Bin-Name': 'jijin-records-shared-data'
        },
        body: JSON.stringify({
          _metadata: {
            appName: "基金投资记录助手",
            version: "1.0.0",
            created: new Date().toISOString()
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

      if (createResponse.ok) {
        const result = await createResponse.json()
        this.config.binId = result.metadata?.id || binId
        this.setConfig(this.config)
        return true
      }

      return false
    } catch (error) {
      console.error('确保bin存在失败:', error)
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
      throw new Error('请先设置 API 密钥')
    }

    try {
      // 确保bin存在
      const binExists = await this.ensureBinExists()
      if (!binExists || !this.config.binId) {
        // 如果bin不存在，返回空数据
        return {
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
      }

      const response = await fetch(`${this.baseUrl}/b/${this.config.binId}/latest`, {
        headers: {
          'X-Master-Key': this.config.apiKey
        }
      })

      if (response.ok) {
        const result = await response.json()
        const data = result.record
        
        // 移除元数据，只返回基金数据
        const { _metadata, ...fundData } = data
        return fundData
      }
      
      return null
    } catch (error) {
      console.error('下载数据失败:', error)
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