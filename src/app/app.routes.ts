import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { HabitTrackerComponent } from './pages/habit-tracker/habit-tracker.component';
import { MoodTrackerComponent } from './pages/mood-tracker/mood-tracker.component';
import { DiaryComponent } from './pages/diary/diary.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'habit-tracker', component: HabitTrackerComponent },
  { path: 'mood-tracker', component: MoodTrackerComponent },
  { path: 'diary', component: DiaryComponent },
];
