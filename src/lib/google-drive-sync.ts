interface GoogleDriveConfig {
  clientId: string
  apiKey: string
}

interface FundData {
  transactions: any[]
  holdings: any[]
  accountSummary: any
  fundPrices: Record<string, number>
}

class GoogleDriveSync {
  private config: GoogleDriveConfig | null = null
  private isAuthenticated = false
  private accessToken: string | null = null

  constructor() {
    // 从 localStorage 加载配置
    this.loadConfig()
  }

  // 设置 Google Drive API 配置
  setConfig(config: GoogleDriveConfig) {
    this.config = config
    localStorage.setItem('google-drive-config', JSON.stringify(config))
  }

  // 从 localStorage 加载配置
  private loadConfig() {
    const saved = localStorage.getItem('google-drive-config')
    if (saved) {
      this.config = JSON.parse(saved)
    }
  }

  // 初始化 Google API
  async initializeGoogleAPI(): Promise<boolean> {
    if (!this.config) {
      throw new Error('请先设置 Google Drive API 配置')
    }

    return new Promise((resolve) => {
      // 动态加载 Google API
      if (typeof window !== 'undefined' && !(window as any).gapi) {
        const script = document.createElement('script')
        script.src = 'https://apis.google.com/js/api.js'
        script.onload = () => {
          (window as any).gapi.load('auth2:client', () => {
            this.setupGoogleAPI().then(resolve)
          })
        }
        document.head.appendChild(script)
      } else {
        this.setupGoogleAPI().then(resolve)
      }
    })
  }

  // 设置 Google API
  private async setupGoogleAPI(): Promise<boolean> {
    try {
      await (window as any).gapi.client.init({
        apiKey: this.config!.apiKey,
        clientId: this.config!.clientId,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        scope: 'https://www.googleapis.com/auth/drive.file'
      })

      const authInstance = (window as any).gapi.auth2.getAuthInstance()
      this.isAuthenticated = authInstance.isSignedIn.get()
      
      if (this.isAuthenticated) {
        this.accessToken = authInstance.currentUser.get().getAuthResponse().access_token
      }

      return true
    } catch (error) {
      console.error('Google API 初始化失败:', error)
      return false
    }
  }

  // 登录 Google 账户
  async signIn(): Promise<boolean> {
    try {
      const authInstance = (window as any).gapi.auth2.getAuthInstance()
      const user = await authInstance.signIn()
      this.isAuthenticated = true
      this.accessToken = user.getAuthResponse().access_token
      return true
    } catch (error) {
      console.error('Google 登录失败:', error)
      return false
    }
  }

  // 登出
  async signOut(): Promise<void> {
    const authInstance = (window as any).gapi.auth2.getAuthInstance()
    await authInstance.signOut()
    this.isAuthenticated = false
    this.accessToken = null
  }

  // 上传数据到 Google Drive
  async uploadData(data: FundData): Promise<boolean> {
    if (!this.isAuthenticated) {
      throw new Error('请先登录 Google 账户')
    }

    try {
      const fileName = 'jijin-records-data.json'
      const fileContent = JSON.stringify(data, null, 2)
      
      // 检查文件是否已存在
      const existingFile = await this.findFile(fileName)
      
      if (existingFile) {
        // 更新现有文件
        return await this.updateFile(existingFile.id, fileContent)
      } else {
        // 创建新文件
        return await this.createFile(fileName, fileContent)
      }
    } catch (error) {
      console.error('上传数据失败:', error)
      return false
    }
  }

  // 从 Google Drive 下载数据
  async downloadData(): Promise<FundData | null> {
    if (!this.isAuthenticated) {
      throw new Error('请先登录 Google 账户')
    }

    try {
      const fileName = 'jijin-records-data.json'
      const file = await this.findFile(fileName)
      
      if (!file) {
        return null
      }

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        return data
      }
      
      return null
    } catch (error) {
      console.error('下载数据失败:', error)
      return null
    }
  }

  // 查找文件
  private async findFile(fileName: string): Promise<any> {
    const response = await (window as any).gapi.client.drive.files.list({
      q: `name='${fileName}' and trashed=false`,
      fields: 'files(id, name, modifiedTime)'
    })

    const files = response.result.files
    return files && files.length > 0 ? files[0] : null
  }

  // 创建新文件
  private async createFile(fileName: string, content: string): Promise<boolean> {
    const boundary = '-------314159265358979323846'
    const delimiter = "\r\n--" + boundary + "\r\n"
    const close_delim = "\r\n--" + boundary + "--"

    const metadata = {
      'name': fileName,
      'parents': [] // 存储在根目录
    }

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      content +
      close_delim

    const request = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`
      },
      body: multipartRequestBody
    })

    return request.ok
  }

  // 更新现有文件
  private async updateFile(fileId: string, content: string): Promise<boolean> {
    const response = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: content
      }
    )

    return response.ok
  }

  // 检查是否已认证
  isSignedIn(): boolean {
    return this.isAuthenticated
  }

  // 获取当前用户信息
  async getCurrentUser(): Promise<any> {
    if (!this.isAuthenticated) return null
    
    const authInstance = (window as any).gapi.auth2.getAuthInstance()
    const user = authInstance.currentUser.get()
    const profile = user.getBasicProfile()
    
    return {
      email: profile.getEmail(),
      name: profile.getName(),
      imageUrl: profile.getImageUrl()
    }
  }
}

export const googleDriveSync = new GoogleDriveSync()
export type { FundData, GoogleDriveConfig } 