import { Redirect } from 'expo-router';

// The shell defaults to the Groups surface, matching the pre-router behavior.
export default function Index() {
  return <Redirect href="/groups" />;
}
