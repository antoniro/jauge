import { expect, test } from '@playwright/test'
import { openAtBrossard, openWithPosition, prepare } from './support'

const cards = (page: import('@playwright/test').Page) => page.locator('article')
const frontCard = (page: import('@playwright/test').Page) => page.locator('article[data-on]')
const openList = async (page: import('@playwright/test').Page, wide: boolean) => { if (!wide) await page.getByRole('button', { name: 'Liste', exact: true }).click() }

test.describe('first open', () => {
  test('says what Jauge does and asks where to look', async ({ page }) => {
    await prepare(page)
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('moins cher')
    await expect(page.getByRole('button', { name: 'Autour de moi' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Choisir un endroit' })).toBeVisible()
    await expect(page).toHaveScreenshot('welcome.png')
  })

  test('a refused position opens the place search instead of guessing', async ({ page }) => {
    await prepare(page)
    await page.goto('/')
    await page.getByRole('button', { name: 'Autour de moi' }).click()
    await expect(page.getByRole('dialog', { name: 'Choisir un endroit' })).toBeVisible()
    await expect(cards(page)).toHaveCount(0)
  })

  test('nothing is ranked before a position or a place is known', async ({ page }) => {
    await prepare(page)
    await page.addInitScript(() => localStorage.setItem('jauge.start', JSON.stringify({ kind: 'position' })))
    await page.goto('/') // the browser will refuse the position
    await expect(page.getByRole('dialog', { name: 'Choisir un endroit' })).toBeVisible()
    await expect(cards(page)).toHaveCount(0)
    await expect(page.getByText(/à moins de \d+ km|autour de/)).toHaveCount(0) // no list either
  })
})

test.describe('a place chosen by hand', () => {
  test('shows an overview: prices, cheapest first, no ranking by savings', async ({ page }, info) => {
    await openAtBrossard(page)
    await expect(page.getByText(/\d+ stations/).first()).toBeVisible()
    await expect(page.getByText('autour de Brossard').first()).toBeVisible()
    await expect(cards(page)).toHaveCount(0)
    await openList(page, info.project.name === 'wide')
    const rows = page.getByRole('button', { name: /Partir de cette station/ })
    const prices = (await rows.evaluateAll((els) => els.slice(0, 8).map((e) => e.getAttribute('aria-label')!))).map((l) => Number(l.match(/([\d,]+) cents/)![1].replace(',', '.')))
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
    await expect(page).toHaveScreenshot('overview-list.png')
  })

  test('the station tapped there becomes the reference and the starting point', async ({ page }, info) => {
    await openAtBrossard(page)
    await openList(page, info.project.name === 'wide')
    await page.getByRole('button', { name: /Partir de cette station/ }).nth(3).click()
    await expect(frontCard(page)).toContainText('Ta référence')
    await expect(frontCard(page).getByLabel('0,00 $')).toBeVisible()
    await expect(page).toHaveScreenshot('starting-point.png')
    // releasing it goes back to the overview
    await page.getByRole('button', { name: /Revenir à la station la plus proche/ }).click()
    await expect(cards(page)).toHaveCount(0)
    await expect(page.getByText('autour de Brossard').first()).toBeVisible()
  })

  test('is remembered on the next visit', async ({ page }) => {
    await prepare(page)
    await page.goto('/')
    await page.getByRole('button', { name: 'Choisir un endroit' }).click()
    await page.getByPlaceholder('Ville ou village').fill('bross')
    await page.getByRole('button', { name: /Brossard/ }).click()
    await expect(page.getByText('autour de Brossard').first()).toBeVisible()
    await page.reload()
    await expect(page.getByText('autour de Brossard').first()).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0)
  })
})

test.describe('with a position', () => {
  test('ranks by real savings against the closest station', async ({ page }, info) => {
    await openWithPosition(page)
    await expect(frontCard(page)).toContainText('Le meilleur plein')
    await expect(frontCard(page)).toContainText('d’économie')
    await expect(frontCard(page).getByRole('button', { name: /Comparée à ta référence/ })).toBeVisible()
    await expect(page.getByText('à moins de 10 km').first()).toBeVisible()
    await expect(page).toHaveScreenshot('main.png')
    await openList(page, info.project.name === 'wide')
    await expect(page.getByRole('button', { name: /^1\. / })).toBeVisible()
    await expect(page.locator('.list-row-ref')).toHaveText('Référence')
  })

  test('there is always a way back to the best fill-up', async ({ page }, info) => {
    await openWithPosition(page)
    const best = await frontCard(page).getByRole('heading').innerText()
    await expect(page.getByRole('button', { name: 'Revenir au meilleur plein' })).toHaveCount(0)
    await openList(page, info.project.name === 'wide')
    await page.getByRole('button', { name: /^3\. / }).click()
    await expect(frontCard(page)).not.toContainText('Le meilleur plein')
    await page.getByRole('button', { name: 'Revenir au meilleur plein' }).click()
    await expect(frontCard(page).getByRole('heading')).toHaveText(best)
    await expect(frontCard(page)).toContainText('Le meilleur plein')
  })

  test('a card unfolds in place to show why, and folds back', async ({ page }) => {
    await openWithPosition(page)
    await frontCard(page).getByRole('button', { name: /Voir les détails/ }).click()
    const card = frontCard(page)
    await expect(card.getByLabel('D’où vient ce montant')).toContainText('Prix')
    await expect(card.getByLabel('D’où vient ce montant')).toContainText('Détour')
    await expect(card.getByRole('img', { name: /Prix des 7 derniers jours/ })).toBeVisible()
    await expect(card.getByText('depuis le 24 nov.')).toBeVisible() // the history is younger than a week
    await expect(card.getByRole('button', { name: 'Ma référence' })).toBeVisible()
    await expect(card.getByRole('button', { name: 'Prix inexact ?' })).toBeVisible()
    await expect(page).toHaveScreenshot('unfolded.png')
    await page.keyboard.press('Escape')
    await expect(card.getByRole('button', { name: /Voir les détails/ })).toHaveAttribute('aria-expanded', 'false')
  })

  test('tapping the selected row of the list unfolds its card', async ({ page }, info) => {
    await openWithPosition(page)
    const wide = info.project.name === 'wide'
    await openList(page, wide)
    await page.getByRole('button', { name: /^2\. / }).click()
    await openList(page, wide)
    await page.getByRole('button', { name: /^2\. / }).click()
    await expect(frontCard(page).getByRole('button', { name: 'Ma référence' })).toBeVisible()
  })

  test('"Ma référence" makes any station the reference', async ({ page }, info) => {
    await openWithPosition(page)
    await openList(page, info.project.name === 'wide')
    await page.getByRole('button', { name: /^4\. / }).click()
    await frontCard(page).getByRole('button', { name: /Voir les détails/ }).click()
    await frontCard(page).getByRole('button', { name: 'Ma référence' }).click()
    await expect(frontCard(page)).toContainText('Ta référence')
    await expect(frontCard(page).getByLabel('0,00 $')).toBeVisible()
  })

  test('the price report sheet names the station and its price', async ({ page }) => {
    await openWithPosition(page)
    const name = await frontCard(page).getByRole('heading').innerText()
    await frontCard(page).getByRole('button', { name: /Voir les détails/ }).click()
    await frontCard(page).getByRole('button', { name: 'Prix inexact ?' }).click()
    const sheet = page.getByRole('dialog', { name: 'Signaler un prix inexact' })
    await expect(sheet).toContainText(name)
    await expect(sheet.getByRole('link', { name: 'Signaler à la Régie' })).toHaveAttribute('href', /regieessencequebec\.ca/)
  })
})

test.describe('settings', () => {
  test('litres and the car change the savings, and are remembered', async ({ page }) => {
    await openWithPosition(page)
    await expect(frontCard(page)).toContainText('Le meilleur plein')
    const before = await frontCard(page).locator('.card-savings .odometer').getAttribute('aria-label')
    await page.getByRole('button', { name: '5 litres de plus' }).click()
    await expect(page.getByLabel('55 litres')).toBeVisible()
    await expect(frontCard(page).locator('.card-savings .odometer')).not.toHaveAttribute('aria-label', before!)
    await page.getByRole('button', { name: 'Réglages' }).click()
    const settings = page.getByRole('dialog', { name: 'Réglages' })
    await settings.getByRole('radio', { name: 'VUS ou camion' }).click()
    await expect(settings.getByText('11,0')).toBeVisible()
    await expect(page).toHaveScreenshot('settings.png')
    await page.reload()
    await expect(page.getByLabel('55 litres')).toBeVisible()
    await page.getByRole('button', { name: 'Réglages' }).click()
    await expect(page.getByRole('dialog', { name: 'Réglages' }).getByRole('radio', { name: 'VUS ou camion' })).toBeChecked()
  })

  test('each car drawing stands for a range of consumption', async ({ page }) => {
    await openWithPosition(page)
    await page.getByRole('button', { name: 'Réglages' }).click()
    const settings = page.getByRole('dialog', { name: 'Réglages' })
    await expect(settings.getByRole('radio', { name: 'Voiture moyenne' })).toBeChecked() // 8,0
    for (let i = 0; i < 3; i++) await settings.getByRole('button', { name: 'Consomme plus' }).click() // 9,5
    await expect(settings.getByRole('radio', { name: 'Voiture moyenne' })).toBeChecked()
    await settings.getByRole('button', { name: 'Consomme plus' }).click() // 10,0
    await expect(settings.getByRole('radio', { name: 'VUS ou camion' })).toBeChecked()
  })
})

// Pictures of the screens the flows above do not stop on, so that a change of styles cannot slip through unseen.
test.describe('how it looks', () => {
  test('the place search', async ({ page }) => {
    await openAtBrossard(page)
    await page.getByRole('button', { name: /Changer d’endroit/ }).click()
    await expect(page.getByRole('dialog', { name: 'Choisir un endroit' }).getByRole('button', { name: 'Ma position' })).toBeVisible()
    await expect(page).toHaveScreenshot('place-search.png')
  })

  test('the ranked list', async ({ page }, info) => {
    await openWithPosition(page)
    await expect(frontCard(page)).toContainText('Le meilleur plein')
    await openList(page, info.project.name === 'wide')
    await expect(page.getByRole('button', { name: /^1\. / })).toBeVisible()
    await expect(page).toHaveScreenshot('ranked-list.png')
  })

  test('the report sheet', async ({ page }) => {
    await openWithPosition(page)
    await frontCard(page).getByRole('button', { name: /Voir les détails/ }).click()
    await frontCard(page).getByRole('button', { name: 'Prix inexact ?' }).click()
    await expect(page.getByRole('dialog', { name: 'Signaler un prix inexact' })).toBeVisible()
    await expect(page).toHaveScreenshot('report.png')
  })

  test('a card that is not the best one', async ({ page }, info) => {
    await openWithPosition(page)
    await openList(page, info.project.name === 'wide')
    await page.getByRole('button', { name: /^3\. / }).click()
    await expect(page.getByRole('button', { name: 'Revenir au meilleur plein' })).toBeVisible()
    await expect(page).toHaveScreenshot('other-card.png')
  })

  test.describe('in the dark', () => {
    test.use({ colorScheme: 'dark' })
    test('the main screen', async ({ page }) => {
      await openWithPosition(page)
      await expect(frontCard(page)).toContainText('Le meilleur plein')
      await expect(page).toHaveScreenshot('dark-main.png')
    })
    test('an unfolded card', async ({ page }) => {
      await openWithPosition(page)
      await frontCard(page).getByRole('button', { name: /Voir les détails/ }).click()
      await expect(frontCard(page).getByRole('img', { name: /Prix des 7 derniers jours/ })).toBeVisible()
      await expect(page).toHaveScreenshot('dark-unfolded.png')
    })
    test('first open', async ({ page }) => {
      await prepare(page)
      await page.goto('/')
      await expect(page.getByRole('button', { name: 'Autour de moi' })).toBeVisible()
      await expect(page).toHaveScreenshot('dark-welcome.png')
    })
  })
})
