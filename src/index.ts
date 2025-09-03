import express, { Express, Request, Response } from 'express'
import cors from 'cors'
import dayjs from 'dayjs'
import { CovidAPIResponse, CovidData } from './interfaces/covid.interface'

const app: Express = express()

const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

const prefix = '/api/v1'
app.use(`${prefix}/covid`, async (req: Request, res: Response) => {
  const {
    iso = 'MEX',
    dateStart = '2020-05-30',
    dateEnd = '2020-06-02'
  } = req.query

  try {
    const startDate = dayjs(String(dateStart))
    const endDate = dayjs(String(dateEnd))
    let currentDate = startDate
    const results: CovidData[] = []

    while (currentDate.isBefore(endDate) || currentDate.isSame(endDate)) {
      const url = `https://covid-api.com/api/reports?date=${currentDate.format(
        'YYYY-MM-DD'
      )}&iso=${iso}`

      const response = await fetch(url)
      const json = (await response.json()) as CovidAPIResponse

      results.push(...json.data)

      currentDate = currentDate.add(1, 'day')
    }

    const daily = results.map((d) => ({
      date: d.date,
      confirmed: d.confirmed,
      deaths: d.deaths,
      active: d.active,
      province: d.region.province
    }))

    const monthlyDeaths = {}

    daily.forEach((d) => {
      const month = dayjs(d.date).format('YYYY-MM')
      monthlyDeaths[month] = (monthlyDeaths[month] || 0) + d.confirmed
    })

    const monthly = Object.entries(monthlyDeaths).map(([month, total]) => ({
      month,
      total
    }))

    const withPct = daily.map((d, i) => {
      if (i === 0) return { ...d, pctChange: 0 }

      const prev = daily[i - 1].confirmed

      return {
        ...d,
        pctChange: prev ? ((d.confirmed - prev) / prev) * 100 : 0
      }
    })

    const withRolling = withPct.map((_, i) => {
      const window = withPct.slice(Math.max(0, i - 6), i + 1)
      const avg = window.reduce((a, v) => a + v.confirmed, 0) / window.length
      return { ...withPct[i], rolling7d: avg }
    })

    res.status(200).json({ withRolling, monthly, withPct, monthlyDeaths })
  } catch (error) {}
})

app.get('/test', (_, res) => res.json({ message: 'App is up and running' }))

app.listen(port, () => console.log(`App is running on port ${port}`))
