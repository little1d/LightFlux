import { Redirect } from 'expo-router';

// Today is the primary workspace and the stable post-authentication destination.
export default function Index() {
  return <Redirect href="/today" />;
}
