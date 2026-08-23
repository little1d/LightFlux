import { Redirect } from 'expo-router';
import React from 'react';

import { isMarketingRuntime } from './marketingRuntime';

const MarketingRoute = ({ children }: { children: React.ReactNode }) =>
  isMarketingRuntime() ? children : <Redirect href="/today" />;

export default MarketingRoute;
