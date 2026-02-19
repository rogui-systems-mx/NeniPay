import { Redirect } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function RootIndex() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
                <ActivityIndicator size="large" color="#FF007F" />
                <Text style={{ marginTop: 20, fontSize: 16, color: '#666' }}>Cargando NeniPay...</Text>
            </View>
        );
    }

    if (!user) {
        return <Redirect href="/auth" />;
    }

    return <Redirect href="/(tabs)" />;
}
