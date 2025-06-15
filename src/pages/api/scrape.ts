// src/pages/api/scrape.ts

import { NextApiRequest, NextApiResponse } from 'next';
import * as cheerio from 'cheerio';
import { withErrorHandler, AppError } from '@/lib/error-handler';

export default withErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    throw new AppError(405, 'Method not allowed');
  }

  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    throw new AppError(400, 'URL is required');
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new AppError(response.status, 'Failed to fetch URL');
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract form fields
    const fields = $('input, select, textarea')
      .map((_, el) => ({
        name: $(el).attr('name') || '',
        label: $(el).attr('placeholder') || $(el).attr('aria-label') || '',
        type: $(el).attr('type') || 'text',
        required: $(el).attr('required') !== undefined
      }))
      .get()
      .filter(field => field.name && field.label);

    // Extract document requirements
    const docs = $('p, li')
      .filter((_, el) => {
        const text = $(el).text().toLowerCase();
        return text.includes('document') || text.includes('proof') || text.includes('evidence');
      })
      .map((_, el) => $(el).text().trim())
      .get();

    // Extract fees
    const fees = $('p, li')
      .filter((_, el) => {
        const text = $(el).text().toLowerCase();
        return text.includes('fee') || text.includes('cost') || text.includes('charge');
      })
      .map((_, el) => $(el).text().trim())
      .get();

    // Extract eligibility criteria
    const eligibility = $('p, li')
      .filter((_, el) => {
        const text = $(el).text().toLowerCase();
        return text.includes('eligible') || text.includes('qualify') || text.includes('requirement');
      })
      .map((_, el) => $(el).text().trim())
      .get();

    // Extract processing time
    const processingTime = $('p, li')
      .filter((_, el) => {
        const text = $(el).text().toLowerCase();
        return text.includes('process') || text.includes('time') || text.includes('duration');
      })
      .map((_, el) => $(el).text().trim())
      .get();

    res.status(200).json({
      url,
      fields,
      docs,
      fees,
      eligibility,
      processingTime
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, 'Error scraping website');
  }
});
